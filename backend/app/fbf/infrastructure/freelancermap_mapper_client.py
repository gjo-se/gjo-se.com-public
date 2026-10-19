"""FreelancermapMapperClient – normalisiert ProjectFreelancerMap-Eintraege in Project."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.infrastructure import scraper_status_client
from app.fbf.models.project import Project
from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.embedding.exceptions import EmbeddingServiceError
from app.shared.status.repositories import status_repository, statusable_repository

if TYPE_CHECKING:
    from app.fbf.services.embedding_service import EmbeddingService

logger = structlog.get_logger(__name__)

_FREELANCERMAP_URL_FRAGMENT = "freelancermap"

_CONTRACT_TYPE_MAP: dict[str, str] = {
    "contracting": "contracting",
    "employee_leasing": "employee_leasing",
    "permanent_position": "permanent_position",
}


def _normalise_start_date(value: str | None) -> str | None:
    """Normalisiert ``M/YYYY`` auf ``MM/YYYY``; gibt andere Werte unveraendert zurueck.

    ``0/YYYY`` oder ``00/YYYY`` werden als „kein gueltiges Startdatum" gewertet
    und zu ``None`` normalisiert.

    Args:
        value: Eingangs-String aus dem Scraper-Ergebnis, z. B. ``"5/2026"``.

    Returns:
        Normalisierter String (z. B. ``"05/2026"``) oder None bei ungueltigem Monat.
    """
    if not value:
        return value
    parts = value.split("/")
    _EXPECTED_PARTS = 2
    if len(parts) == _EXPECTED_PARTS and parts[0].isdigit():
        month = int(parts[0])
        if month == 0:
            return None
        return f"{parts[0].zfill(2)}/{parts[1]}"
    return value


class FreelancermapMapperClient:
    """Normalisiert gescrapte ProjectFreelancerMap-Eintraege in die Project-Tabelle.

    Fuer jeden neuen Roheintrag werden Project und Contact
    angelegt. Duplikate (gleiche url) werden uebersprungen.

    Automatische semantische Deduplizierung findet NICHT mehr statt (bewusst
    entfernt). Die Gruppierung (Master/Slave via ``canonical_id``) erfolgt
    ausschliesslich manuell ueber die Admin-UI.

    Attributes:
        _embedding_service: Optionaler EmbeddingService fuer das Schreiben von
            Project-Embeddings in LanceDB. Wenn None, werden keine Embeddings
            geschrieben.
    """

    def __init__(
        self,
        embedding_service: EmbeddingService | None = None,
    ) -> None:
        self._embedding_service = embedding_service

    async def run(self, db: AsyncSession) -> dict[str, int | float]:
        """Laedt unmapped ProjectFreelancerMap-Eintraege und schreibt sie in Project.

        Filterkriterium: ``mapped_at IS NULL``. Nach erfolgreichem Schreiben wird
        ``mapped_at`` gesetzt – dadurch wird der Eintrag bei Folgelaeufen
        uebersprungen, ohne dass ein teurer URL-Vergleich gegen die Projects-Tabelle
        noetig waere.

        Args:
            db: Datenbankverbindung.

        Returns:
            Dict mit ``new_projects``, ``url_matches``, ``errors``-Zaehlern.
            ``duplicates`` bleibt aus Kompatibilitaet erhalten, ist aber immer 0
            (keine automatische Deduplizierung mehr).
        """
        raw_entries = await self._load_raw_entries(db)
        total = len(raw_entries)
        logger.info("FreelancermapMapperClient: %d raw entries to process", total)
        scraper_status_client.start_mapping(total)

        new_projects = 0
        duplicates = 0  # keine automatische Deduplizierung mehr
        errors = 0
        url_matches = 0
        for i, entry in enumerate(raw_entries):
            if scraper_status_client.is_aborted():
                logger.info("FreelancermapMapperClient: abort requested – stopping at %d/%d", i, total)
                break
            try:
                result = await self._process_entry(db, entry)
                if result == "new":
                    new_projects += 1
                elif result == "url_match":
                    url_matches += 1
            except Exception:
                logger.exception("FreelancermapMapperClient: Error processing entry id=%d", entry.id)
                errors += 1

            if (i + 1) % 100 == 0:
                logger.info(
                    "FreelancermapMapperClient: Progress %d/%d – new=%d url=%d err=%d",
                    i + 1,
                    total,
                    new_projects,
                    url_matches,
                    errors,
                )
            if (i + 1) % 10 == 0:
                scraper_status_client.update_mapping(
                    processed=i + 1,
                    new=new_projects,
                    duplicates=duplicates,
                    url_matches=url_matches,
                    errors=errors,
                )

        # Collect sub-service stats
        embedding_stats: dict[str, int | float] = {}
        if self._embedding_service is not None:
            embedding_stats = self._embedding_service.get_stats()

        logger.info(
            "FreelancermapMapperClient: Done – total=%d new=%d url=%d err=%d embedding_calls=%s estimated_cost=$%s",
            total,
            new_projects,
            url_matches,
            errors,
            embedding_stats.get("calls", 0),
            embedding_stats.get("estimated_cost", 0),
        )
        return {
            "total_processed": total,
            "new_projects": new_projects,
            "duplicates": duplicates,
            "url_matches": url_matches,
            "errors": errors,
            "embedding_calls": embedding_stats.get("calls", 0),
            "embedding_tokens": embedding_stats.get("total_tokens", 0),
            "estimated_cost": embedding_stats.get("estimated_cost", 0.0),
        }

    async def _load_raw_entries(
        self,
        db: AsyncSession,
    ) -> list[ProjectFreelancerMap]:
        """Laedt alle noch nicht gemappten Roh-Eintraege (mapped_at IS NULL).

        Args:
            db: Datenbankverbindung.

        Returns:
            Liste unmapped ProjectFreelancerMap-Eintraege.
        """
        stmt = select(ProjectFreelancerMap).where(ProjectFreelancerMap.mapped_at.is_(None))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def _process_entry(
        self,
        db: AsyncSession,
        entry: ProjectFreelancerMap,
    ) -> str:
        """Processes a single raw entry.

        Strategie:
        1. URL-Dedup: Existiert ``Project.url`` bereits? → ueberspringen.
        2. Kein URL-Duplikat → Project anlegen (Master, ``canonical_id = None``).

        Automatische semantische Deduplizierung findet bewusst NICHT statt.
        Die Gruppierung (Master/Slave via ``canonical_id``) erfolgt ausschliesslich
        manuell ueber die Admin-UI.

        Immutability: Projects are NEVER updated after creation.
        This method performs INSERT on new projects only.

        Args:
            db: Database connection.
            entry: Raw entry to process.

        Returns:
            ``"new"`` if a new Project was saved,
            ``"url_match"`` if URL already existed.
        """
        # 1. URL-Dedup (bestehende Logik)
        existing = await db.execute(select(Project.id).where(Project.url == entry.url))
        if existing.scalar_one_or_none() is not None:
            logger.debug("Project url already exists, skipping: %s", entry.url)
            entry.mapped_at = datetime.now(UTC)
            await db.commit()
            return "url_match"

        # 2. Kein Duplikat → Project anlegen (Master)
        project = self._build_project(entry)
        project.canonical_id = None
        project.similarity_score = 1.0
        db.add(project)
        await db.flush()
        await db.refresh(project)

        # Default-Status "new" fuer frische Master-Projects
        status_obj = await status_repository.get_by_name_and_category(db, "new", "project")
        if status_obj is not None:
            await statusable_repository.set_status(db, "project", project.id, status_obj.id)

        # Embedding in LanceDB schreiben (fuer manuelles Cousins/Master-Matching)
        if self._embedding_service is not None:
            try:
                await self._embedding_service.embed_project(ProjectOut.model_validate(project), db)
            except EmbeddingServiceError:
                logger.warning(
                    "FreelancermapMapperClient: Embedding write failed for project id=%d – "
                    "project saved but not embedded",
                    project.id,
                )

        entry.mapped_at = datetime.now(UTC)
        await db.commit()

        return "new"

    def _build_project(self, entry: ProjectFreelancerMap) -> Project:
        """Baut ein Project-Objekt aus einem PM-Roheintrag (ohne canonical_id/similarity_score).

        Args:
            entry: Raw entry to build from.

        Returns:
            Project-Objekt (noch nicht persisted).
        """
        duration_str = str(entry.duration) if entry.duration is not None else None
        return Project(
            url=entry.url,
            title=entry.title.strip(),
            description=entry.description,
            city=entry.city,
            country=entry.country,
            remote_percent=entry.remote_percent,
            contract_type=entry.contract_type,
            duration=duration_str,
            start_date=_normalise_start_date(entry.start_date),
            posted_at=entry.posted_at,
            scraped_at=entry.scraped_at,
            endcustomer=entry.endcustomer,
            company_name=entry.agency,
            contact_name=entry.contact_name,
            industry=entry.industry,
        )

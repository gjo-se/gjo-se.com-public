"""EINZIGE kanonische Scraper-Orchestrierung (SSOT-Regel).

Dieses Modul enthaelt den vollstaendigen, getesteten Ablauf eines Unified-Runs
(Login -> paginierter Scrape -> Mapper -> Embedding -> Auto-Archive) – exakt der
Ablauf, den die lokale In-Process-Variante (dev) und der isolierte Fargate-Job
(prod) GEMEINSAM nutzen. Es gibt KEINE zweite/parallele Re-Implementierung.

Aufrufer sind nur noch duenne Einstiegspunkte:
  * ``aiscope_router``   – Status-Lifecycle (Background/Sync) fuer dev in-process
  * ``run_scraper_job``  – Registry-Bootstrap + Exit-Code-Mapping fuer prod Fargate

Die Funktion ist bewusst selbststaendig gegen jede DB-Session und ruft die
gleichen Pruefungen auf (Portal aktiv? Credentials vorhanden? Abort?), unabhaengig
davon ob sie im API-Prozess oder im isolierten Job laeuft. Da beide Aufrufer
dieselbe Funktion aufrufen, ist dev damit die SSOT fuer prod.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from app.fbf.infrastructure.freelancermap_mapper_client import FreelancermapMapperClient
    from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService
    from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)


async def run_unified_scraper(
    *,
    force_full: bool = False,
    max_results: int | None = None,
    since_days: int | None = None,
    scraper_factory: Callable[[AsyncSession], FreelancermapScrapingService],
    mapper: FreelancermapMapperClient,
) -> dict[str, object]:
    """Fuehrt einen kompletten Unified-Scraper-Lauf aus (eine einzige Variante).

    Args:
        force_full: Delta-Cutoff ignorieren (True = Backfill ueber alle Seiten).
        max_results: Limit pro JobRole (None = unbegrenzt).
        since_days: Optionaler unterer Zeit-Bound (Tage). Begrenzt einen Backfill
            fuer neue SearchTerms auf die letzten *n* Tage; bestehende Terms
            behalten ihren normalen Delta-Cutoff.
        scraper_factory: Baut den session-gebundenen ``FreelancermapScrapingService``.
        mapper: Der gemappte ``FreelancermapMapperClient``.

    Returns:
        Ergebnis-Dict mit ``status`` ("done"/"error"/"aborted"/"skipped"-
        Varianten), ``saved``, optional ``stats``/``skipped``.
    """
    from app.fbf.infrastructure import scraper_status_client
    from app.fbf.repositories import project_repository
    from app.fbf.services import project_service
    from app.shared.credential_store.dependencies.credential_store_dependencies import (
        get_admin_credential_service,
    )
    from app.shared.db_access.consumer_label import set_consumer_label
    from app.shared.integration_registry.registry import KNOWN_INTEGRATIONS

    set_consumer_label("scraper")

    try:
        async with project_repository.open_session() as db:
            _seed = await get_admin_credential_service().seed_from_registry(db)

        async with project_repository.open_session() as db:
            fm_creds = await get_admin_credential_service().get_credentials(db, service="freelancermap")
            fm_has_credentials = bool(fm_creds.get("login_username") and fm_creds.get("login_password"))

            fm_row = await get_admin_credential_service().get_by_service(db, service="freelancermap")
            # active wurde auf core_statusable migriert (#1076); Existenz = aktiv.
            fm_active = fm_row is not None

        if not fm_active:
            logger.info("run_unified_scraper: freelancermap inactive – skipping")
            _portals = KNOWN_INTEGRATIONS
            return {
                "status": "done",
                "saved": 0,
                "skipped": ["freelancermap"],
            }

        if not fm_has_credentials:
            logger.warning("run_unified_scraper: freelancermap without credentials – skipping")
            return {
                "status": "done",
                "saved": 0,
                "skipped": ["freelancermap"],
                "reason": "no_credentials",
            }

        async with project_repository.open_session() as db:
            scraper = scraper_factory(db)
            _run = await scraper.run(
                max_results=max_results,
                force_full=force_full,
                username=fm_creds.get("login_username") or None,
                password=fm_creds.get("login_password") or None,
                since_days=since_days,
            )

        if scraper_status_client.is_aborted():
            return {"status": "aborted", "saved": 0}

        async with project_repository.open_session() as db:
            stats = await mapper.run(db)

        if scraper_status_client.is_aborted():
            return {"status": "aborted", "saved": 0}

        async with project_repository.open_session() as db:
            archived = await project_service.archive_stale_projects(db)
        logger.info("run_unified_scraper: archived %d stale project(s)", archived)

        return {
            "status": "done",
            "saved": stats["new_projects"],
            "stats": stats,
        }
    except Exception:
        logger.exception("run_unified_scraper: unified run failed")
        return {"status": "error", "saved": 0}

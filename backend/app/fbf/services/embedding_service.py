"""FBF embedding helpers: text construction and Project embedding.

The generic OpenRouter client lives in ``app.shared.embedding.infrastructure.embedding_client``; this
module keeps the fbf-specific text builders and the Project-aware service.
The batch backfill lives in :mod:`app.fbf.services.project_embedding_service`.
"""

from __future__ import annotations

import structlog

from app.fbf.repositories import project_repository
from app.fbf.schemas.project_freelancer_map_schemas import ProjectFreelancerMapOut
from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.domain.text_rules import clean_str
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient

logger = structlog.get_logger(__name__)

# Sentinel values for start_date that carry no information
_INVALID_START_DATES: frozenset[str] = frozenset({"0/0", "/"})


def _clean_start_date(raw: str | None) -> str | None:
    """Clean start_date, treating "0/0" and "/" as None."""
    cleaned = clean_str(raw)
    if cleaned is None:
        return None
    if cleaned in _INVALID_START_DATES:
        return None
    return cleaned


def build_embedding_text(raw_entry: ProjectFreelancerMapOut) -> str:
    """NULL-tolerant text construction for embedding API (PM raw entries)."""
    lines: list[str] = []

    # title (0 % NULL) — primary identifier
    title = clean_str(raw_entry.title)
    if title:
        lines.append(f"title: {title}")

    # description (0 % NULL) — highest content discrimination
    desc = clean_str(raw_entry.description)
    if desc:
        lines.append("description: |")
        lines.extend(f"  {desc_line}" for desc_line in desc.splitlines())

    # city (0.5 % NULL) — location distinction
    city = clean_str(raw_entry.city)
    if city:
        lines.append(f"city: {city}")

    # duration (23.8 % NULL) — runtime in months
    if raw_entry.duration is not None:
        lines.append(f"duration: {raw_entry.duration} Monate")

    # start_date (56 % NULL) — month/year of project start
    start_date = _clean_start_date(raw_entry.start_date)
    if start_date:
        lines.append(f"start_date: {start_date}")

    # Posted at (0 % NULL) — publication date as ISO date
    posted_str = raw_entry.posted_at.strftime("%Y-%m-%d")
    lines.append(f"posted_at: {posted_str}")

    return "\n".join(lines)


def build_embedding_text_for_project(project: ProjectOut) -> str:
    """NULL-tolerant text construction for Project (normalised) entries.

    Uses the same field order and labels as ``build_embedding_text``
    so embeddings from PM and Project are comparable in the same
    vector space.
    """
    lines: list[str] = []

    title = clean_str(project.title)
    if title:
        lines.append(f"title: {title}")

    desc = clean_str(project.description)
    if desc:
        lines.append("description: |")
        lines.extend(f"  {desc_line}" for desc_line in desc.splitlines())

    city = clean_str(project.city)
    if city:
        lines.append(f"city: {city}")

    # Project.duration is TEXT (e.g. "6" or "6 Monate"), PM.duration is INTEGER.
    # The mapper converts PM integer to str(), so strip " Monate" if present.
    if project.duration is not None:
        dur_value = project.duration.removesuffix(" Monate").strip()
        if dur_value:
            lines.append(f"duration: {dur_value} Monate")

    start_date = _clean_start_date(project.start_date)
    if start_date:
        lines.append(f"start_date: {start_date}")

    if project.posted_at is not None:
        posted_str = project.posted_at.strftime("%Y-%m-%d")
        lines.append(f"posted_at: {posted_str}")

    return "\n".join(lines)


class EmbeddingService(EmbeddingClient):
    """FBF embedding service: generic client plus Project embedding.

    Adds Project-specific text construction and vector persistence on top of
    the shared :class:`~app.shared.embedding.infrastructure.embedding_client.EmbeddingClient`.
    """

    async def embed_project(self, project: ProjectOut, db: AsyncSession) -> None:
        """Embed a single Project and persist the vector on ``project.vector``.

        Called by the mapper immediately after a new canonical Project is
        created, so subsequent PM entries can be deduplicated against it.

        The ``project.vector`` assignment is flushed by the caller's commit
        (the caller owns the gjo_se_com session passed as *db*).  A separate
        core-DB session is opened via the repository seam for the
        ``openrouter:1`` credential lookup.

        Args:
            project: The newly created Project (must have an id).
            db: Async session for the gjo_se_com database (commit by caller).
        """
        text = build_embedding_text_for_project(project)

        async with project_repository.open_core_session() as core_db:
            vector = await self.embed_text(text, core_db)

        await project_repository.set_vector(db, project.id, vector)
        logger.info("Embedded project id=%d → project.vector.", project.id)

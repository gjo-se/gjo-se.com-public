"""Database access for the Project↔Skill junction (AIScope domain).

V2 dedup architecture: ``project_skill`` rows are the untouched extraction
truth and may point at slave skills. This repository owns the **raw junction
rows** (link/delete). The skill-resolving reads (master id, importance blend,
CV rows, scored/active skill projections) belong to the Skill aggregate and live
in ``skill_repository`` (``effective_master_id`` / ``effective_links_select``,
mirrored by the DB view ``project_skill_effective`` for ad-hoc SQL). Dedup
actions never rewrite the junction.
"""

from typing import Any, cast

import structlog
from sqlalchemy import CursorResult, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_skill import ProjectSkill

logger = structlog.get_logger(__name__)


async def link(
    db: AsyncSession,
    project_id: int,
    skill_id: int,
    importance: int | None = None,
) -> bool:
    """Idempotently link a project to a skill (extraction truth, unresolved).

    Portable insert-if-absent (works on SQLite and PostgreSQL): checks for an
    existing row before inserting, so a repeated mapper run never duplicates a
    ``(project_id, skill_id)`` pair. Master resolution happens at read time.

    Callers should call :func:`delete_by_project` first to ensure the
    extraction is the single source of truth for this project.

    Args:
        db: gjo_se_com database session.
        project_id: Master project primary key.
        skill_id: Extracted skill primary key (master or slave).
        importance: Projekt-spezifische LLM-Importance (0–5, nullable).
            5 = Must-Have, 4 = Technologien, 3 = Nice-to-Have,
            2 = Aufgaben/Fließtext, 1 = nur erwähnt.

    Returns:
        True if a new link was created, False if it already existed.
    """
    existing = await db.get(ProjectSkill, {"project_id": project_id, "skill_id": skill_id})
    if existing is not None:
        return False
    db.add(ProjectSkill(project_id=project_id, skill_id=skill_id, importance=importance))
    await db.flush()
    return True


async def delete_by_project(db: AsyncSession, project_id: int) -> int:
    """Delete all project_skill rows for a project (re-extract prep).

    Ensures the next extraction is the SSOT for this project — no stale
    links from previous runs survive.

    Args:
        db: gjo_se_com database session.
        project_id: Master project primary key.

    Returns:
        Number of deleted rows.
    """
    result = await db.execute(delete(ProjectSkill).where(ProjectSkill.project_id == project_id))
    await db.flush()
    count = cast(CursorResult[Any], result).rowcount
    if count:
        logger.info("Cleared %d project_skill rows for project_id=%d", count, project_id)
    return count


async def delete_for_project(db: AsyncSession, project_id: int) -> None:
    """Remove all skill links of a project.

    Args:
        db: gjo_se_com database session.
        project_id: Master project primary key.
    """
    _ = await db.execute(delete(ProjectSkill).where(ProjectSkill.project_id == project_id))
    await db.flush()

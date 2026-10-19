"""Public read use-cases for FBF skills (gjo_se_com)."""

from __future__ import annotations

from app.fbf.repositories import project_repository, skill_lookup_repository, skill_repository
from app.fbf.repositories.skill_repository import SkillRef
from app.shared.db_access.session_types import AsyncSession

# Projekt-IDs sind PostgreSQL-``integer`` (int32). Höhere Werte lassen ``db.get``
# mit ``NumericValueOutOfRange`` scheitern (→ 500). Solche unbekannten IDs werden
# wie „nicht gefunden" behandelt (→ None/404), damit überlange oder kaputte Links
# (z. B. aus dem CV-Mailversand) keinen Serverfehler auslösen.
_PROJECT_ID_MAX = 2_147_483_647


async def list_public_skills(
    db: AsyncSession,
    group_id: int | None = None,
    limit: int | None = None,
    tag: str = "site:public",
    grouped_only: bool = False,
) -> list[tuple[SkillRef, float | None]]:
    """Return tagged skills with their global avg importance.

    Each tuple carries the skill and the global average importance across all
    projects so the router can compute the blended ``effective_importance``
    (identical to the Proof path). ``tag`` defaults to the public site tag
    (``site:public``); pass another tag (e.g. ``site:promo``) to select a
    different curated set. ``grouped_only`` restricts the result to skills with
    a ``group_id`` – the public pages render only grouped skills.
    """
    return await skill_lookup_repository.get_public_skills(
        db,
        group_id=group_id,
        limit=limit,
        tag=tag,
        grouped_only=grouped_only,
    )


async def get_project_public_skills(
    db: AsyncSession,
    project_id: int,
) -> list[tuple[SkillRef, float | None, float | None]] | None:
    """Return the public skills of a project for the Proof-Match-Sektion.

    Returns None when the project does not exist (→ 404 in the router).
    Only active, non-blacklisted skills are returned, resolved to their master.
    Each tuple carries the per-project LLM estimate and the global average so
    the caller can compute the single blended ``effective_importance``.
    """
    if project_id < 1 or project_id > _PROJECT_ID_MAX:
        return None
    if not await project_repository.exists(db, project_id):
        return None
    return await skill_repository.get_public_project_skills(db, project_id)

"""Statusable read/write helpers for FBF skills (``fbf_skill`` scope).

Extracted from the former monolithic ``skill_dedup_service`` (god-file split).
Both the write side (mutations/bulk actions) and the read side (board,
candidates, suggestions) need a skill's status, so this cohesive helper module
is the single source for reading and assigning it.
"""

from __future__ import annotations

from app.shared.db_access.session_types import AsyncSession
from app.shared.status.repositories import status_repository, statusable_repository


async def _get_skill_status(db: AsyncSession, skill_id: int) -> str:
    """Return the Status name of a skill, defaulting to ``pending``.

    Args:
        db: Active DB session.
        skill_id: Skill whose status is read.

    Returns:
        The current status name, or ``pending`` when the skill has none.
    """
    entry = await statusable_repository.get_status(db, "fbf_skill", skill_id)
    return entry.status.name if entry else "pending"


async def _set_skill_status(db: AsyncSession, skill_id: int, status_name: str) -> None:
    """Assign a named Status to a skill when the status exists.

    Resolution goes through the ``fbf_skill`` scope; unknown status names are
    silently ignored.

    Args:
        db: Active DB session.
        skill_id: Skill to update.
        status_name: Target Status name.
    """
    # Auflösung über den Scope (category ist 'general', Scope trägt 'fbf_skill').
    status_obj = await status_repository.get_by_name_for_type(db, status_name, "fbf_skill")
    if status_obj:
        await statusable_repository.set_status(db, "fbf_skill", skill_id, status_obj.id)

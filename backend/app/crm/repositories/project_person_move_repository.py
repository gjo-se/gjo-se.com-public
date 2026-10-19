"""Conflict-free re-pointing of ``project_person`` links (gjo_se_com).

Owns the master-merge move that re-points all links of one project to another.
Split out of ``project_person_repository`` so that module stays cohesive
(LCOM4); the entity touches only its own aggregate (``project_person``).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.project_person import ProjectPerson

#: Label marking the project's single primary contact person (partial UNIQUE).
_PRIMARY_LABEL = "primary"
#: Fallback label for a moved primary contact when the target already has one.
_SECONDARY_LABEL = "secondary"


async def move_links(db: AsyncSession, from_project_id: int, to_project_id: int) -> int:
    """Re-points all ``project_person`` links to another project.

    Resolves conflicts up front so neither the composite UNIQUE
    ``(project_id, crm_person_id)`` nor the partial UNIQUE on
    ``(project_id)`` for ``label = 'primary'`` is violated:

    * A person already linked to the target is dropped from the source
      (exact duplicate) instead of being moved twice.
    * A moved ``primary`` contact whose person is not yet on the target keeps
      its label; when the target already has a primary, the moved contact is
      demoted to ``secondary`` (the target's existing primary wins).

    The caller owns the transaction and must commit.

    Args:
        db: Database session.
        from_project_id: Project the links currently belong to (old master).
        to_project_id: Project the links are moved to (new master).

    Returns:
        Number of links re-pointed to ``to_project_id`` (dropped duplicates are
        not counted).
    """
    target_result = await db.execute(select(ProjectPerson).where(ProjectPerson.project_id == to_project_id))
    target_links = list(target_result.scalars().all())
    target_person_ids = {link.crm_person_id for link in target_links}
    target_has_primary = any(link.label == _PRIMARY_LABEL for link in target_links)

    source_result = await db.execute(select(ProjectPerson).where(ProjectPerson.project_id == from_project_id))
    source_links = list(source_result.scalars().all())
    moved = 0
    for link in source_links:
        if link.crm_person_id in target_person_ids:
            await db.delete(link)
            continue
        if link.label == _PRIMARY_LABEL and target_has_primary:
            link.label = _SECONDARY_LABEL
        link.project_id = to_project_id
        target_person_ids.add(link.crm_person_id)
        if link.label == _PRIMARY_LABEL:
            target_has_primary = True
        moved += 1
    await db.flush()
    return moved

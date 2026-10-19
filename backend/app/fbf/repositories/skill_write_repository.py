"""Database writers for FBF skill entries (gjo_se_com).

Owns the skill mutations: create/delete, the single-field ``set_*`` writers,
group reordering and project-link reassignment. Split out of
``skill_repository``; the group-relative ``update`` sort logic stays with the
core reads there.
"""

from __future__ import annotations

from typing import Any
from typing import cast as type_cast

from sqlalchemy import CursorResult, select
from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.repositories.skill_read_repository import SkillRef, to_skill_ref


async def reorder_skills(db: AsyncSession, group_id: int, ordered_ids: list[int]) -> int:
    """Set group-relative skill positions without transient unique conflicts."""
    result = await db.execute(
        select(Skill).where(
            Skill.group_id == group_id,
            Skill.canonical_id.is_(None),
        )
    )
    skills_by_id = {skill.id: skill for skill in result.scalars().all()}
    if set(ordered_ids) != set(skills_by_id) or len(ordered_ids) != len(skills_by_id):
        raise ValueError("ordered_ids must contain exactly the master skills of the group")

    for temporary_index, skill_id in enumerate(ordered_ids):
        skills_by_id[skill_id].sort = -(temporary_index + 1)
    await db.flush()

    for new_index, skill_id in enumerate(ordered_ids):
        skills_by_id[skill_id].sort = new_index
    await db.flush()
    return len(ordered_ids)


async def create(
    db: AsyncSession,
    *,
    name: str,
    importance: int | None = None,
    canonical_id: int | None = None,
) -> SkillRef:
    """Persist a new skill from its scalar fields and return the DTO.

    Args:
        db: Active async DB session.
        name: Unique skill name.
        importance: Optional curated/LLM importance (0–5).
        canonical_id: Optional self-FK master id (None = master).

    Returns:
        The created skill as DTO.
    """
    skill = Skill(name=name, importance=importance, canonical_id=canonical_id)
    db.add(skill)
    await db.flush()
    await db.refresh(skill)
    return to_skill_ref(skill)


async def set_vector(db: AsyncSession, skill_id: int, vector: list[float]) -> None:
    """Persist an embedding vector on a skill.

    Args:
        db: Active async DB session.
        skill_id: The ``fbf_skill.id`` whose vector is written.
        vector: The embedding vector to store.
    """
    skill = await db.get(Skill, skill_id)
    if skill is None:
        return
    skill.vector = vector
    await db.flush()


async def set_canonical_id(db: AsyncSession, skill_id: int, canonical_id: int | None) -> None:
    """Set (or clear) the self-FK master id of a skill.

    Args:
        db: Active async DB session.
        skill_id: The ``fbf_skill.id`` to mutate.
        canonical_id: Target master id, or None to promote to master.
    """
    skill = await db.get(Skill, skill_id)
    if skill is None:
        return
    skill.canonical_id = canonical_id
    await db.flush()


async def delete(db: AsyncSession, skill_id: int) -> bool:
    """Remove a skill by id.

    Returns:
        True when the row was deleted; False when no row with the id exists.
    """
    skill = await db.get(Skill, skill_id)
    if skill is None:
        return False
    await db.delete(skill)
    await db.flush()
    return True


async def reassign_projects(db: AsyncSession, from_skill_id: int, target_id: int | None) -> int:
    """Repoint all project links from one skill to ``target_id`` (or delete them).

    When ``target_id`` is set, every ``project_skill`` row of ``from_skill_id``
    is repointed to it (skipping projects already linked to the target to keep
    the composite PK unique). When ``target_id`` is None, the links are removed.

    Args:
        db: Database session.
        from_skill_id: Source skill whose project links are repointed.
        target_id: Target skill id, or None to drop the links.

    Returns:
        Number of link rows updated or deleted.
    """
    if target_id is None:
        deleted = await db.execute(sa_delete(ProjectSkill).where(ProjectSkill.skill_id == from_skill_id))
        await db.flush()
        return type_cast(CursorResult[Any], deleted).rowcount or 0

    existing_targets = await db.execute(select(ProjectSkill.project_id).where(ProjectSkill.skill_id == target_id))
    target_projects = {row[0] for row in existing_targets.all()}

    source_rows = await db.execute(select(ProjectSkill).where(ProjectSkill.skill_id == from_skill_id))
    updated = 0
    for link in source_rows.scalars().all():
        if link.project_id in target_projects:
            await db.execute(
                sa_delete(ProjectSkill).where(
                    ProjectSkill.project_id == link.project_id,
                    ProjectSkill.skill_id == from_skill_id,
                )
            )
        else:
            link.skill_id = target_id
            updated += 1
    await db.flush()
    return updated

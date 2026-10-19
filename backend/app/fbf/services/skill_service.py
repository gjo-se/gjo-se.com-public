"""Business logic for FBF skills (gjo_se_com)."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.fbf.repositories import skill_repository
from app.fbf.repositories.skill_repository import SkillFilter, SkillRef
from app.fbf.schemas.skill_schemas import SkillCreate, SkillReorderRequest, SkillUpdate
from app.shared.db_access.session_types import AsyncSession
from app.shared.status.repositories import statusable_repository


def effective_importance(
    skill: SkillRef,
    project_importance: float | None,
    avg_importance: float | None,
) -> float:
    """Equal-weight blend of three independent importance sources.

    Falls back gracefully when one or more sources are NULL:
    the weight is redistributed across the remaining sources.

    Returns 0.0 when all three sources are NULL.
    """
    sources: list[float] = []
    if project_importance is not None:
        sources.append(float(project_importance))
    if avg_importance is not None:
        sources.append(float(avg_importance))
    if skill.importance is not None:
        sources.append(float(skill.importance))

    if not sources:
        return 0.0
    return sum(sources) / len(sources)


async def count_filtered(db: AsyncSession, filters: SkillFilter) -> int:
    """Return total count of matching skills."""
    return await skill_repository.count_filtered(db, filters)


async def list_paginated_with_counts(
    db: AsyncSession,
    filters: SkillFilter,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "name",
    sort_order: str = "asc",
    masters_only: bool = True,
) -> list[tuple[SkillRef, int, float | None, str | None, str | None]]:
    """Return paginated skills with their project usage count, avg project importance, and status."""
    return await skill_repository.get_paginated_with_counts(
        db,
        filters=filters,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        masters_only=masters_only,
    )


async def get_skills_by_ids(db: AsyncSession, skill_ids: list[int]) -> list[SkillRef]:
    """Return skills by their IDs as DTOs."""
    return await skill_repository.get_by_ids(db, skill_ids)


async def get_skill_by_id(db: AsyncSession, skill_id: int) -> SkillRef | None:
    """Return a single skill by ID as DTO."""
    return await skill_repository.get_by_id(db, skill_id)


async def create_skill(db: AsyncSession, data: SkillCreate) -> SkillRef:
    """Persist a new skill from validated input and return the created DTO."""
    return await skill_repository.create(
        db,
        name=data.name,
        importance=data.importance,
    )


async def update_skill(db: AsyncSession, skill_id: int, data: SkillUpdate) -> SkillRef | None:
    """Persist changes to an existing skill and return the updated DTO.

    Bei einem Gruppenwechsel wird ``sort`` (gruppenrelativer Index, partieller
    Unique-Index ``(group_id, sort)``) im Repository neu gesetzt.
    """
    existing = await skill_repository.get_by_id(db, skill_id)
    if existing is None:
        return None
    changes = data.model_dump()
    return await skill_repository.update(
        db,
        skill_id,
        changes,
        previous_group_id=existing.group_id,
    )


async def delete_skill(db: AsyncSession, skill_id: int) -> None:
    """Remove a skill from the database."""
    await skill_repository.delete(db, skill_id)


async def reorder_skills(db: AsyncSession, payload: SkillReorderRequest) -> int:
    """Set skill sort values from the ordered ids within one group."""
    try:
        return await skill_repository.reorder_skills(db, payload.group_id, payload.ordered_ids)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


async def confirm_skills(db: AsyncSession, skill_ids: list[int]) -> int:
    """Set all pending skills in ``skill_ids`` to ``confirmed`` via core_statusable.

    Returns:
        Number of skills transitioned to ``confirmed``.
    """
    from app.shared.status.repositories import status_repository

    active_status = await status_repository.get_by_name_for_type(db, "active", "fbf_skill")
    if active_status is None:
        return 0

    skills = await skill_repository.get_by_ids(db, skill_ids)
    confirmed = 0
    for skill in skills:
        current = await statusable_repository.get_status(db, "fbf_skill", skill.id)
        if current is None or current.status.name != "active":
            await statusable_repository.set_status(db, "fbf_skill", skill.id, active_status.id)
            confirmed += 1
    await db.flush()
    return confirmed


async def list_confirmed_names(db: AsyncSession) -> list[str]:
    """Return the names of all confirmed skills (for the extraction prompt)."""
    skills = await skill_repository.get_confirmed(db)
    return [s.name for s in skills]


async def get_or_create_by_name(db: AsyncSession, name: str) -> SkillRef:
    """Return the skill with ``name`` or create it as ``pending``.

    Safety net for the extractor: reuses an exactly matching skill (any status)
    and only creates a new ``pending`` skill when none exists.

    Args:
        db: Database session.
        name: Skill name.

    Returns:
        The existing or newly created skill.
    """
    existing = await skill_repository.get_by_name(db, name)
    if existing is not None:
        return existing
    return await skill_repository.create(db, name=name)


async def reassign_projects(db: AsyncSession, skill_id: int, target_id: int | None) -> int:
    """Repoint all project links of ``skill_id`` to ``target_id`` (or remove them).

    Args:
        db: Database session.
        skill_id: Source skill whose project links are repointed.
        target_id: Target skill id, or None to remove the links.

    Returns:
        Number of project links updated.

    Raises:
        HTTPException 404: Source or target skill not found.
    """
    source = await skill_repository.get_by_id(db, skill_id)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    if target_id is not None:
        target = await skill_repository.get_by_id(db, target_id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target skill not found")
    updated = await skill_repository.reassign_projects(db, skill_id, target_id)
    await db.commit()
    return updated


async def delete_guarded(db: AsyncSession, skill_id: int) -> None:
    """Delete a skill, refusing when projects still reference it.

    Args:
        db: Database session.
        skill_id: Skill to delete.

    Raises:
        HTTPException 404: Skill not found.
        HTTPException 409: Skill is still referenced by projects.
    """
    skill = await skill_repository.get_by_id(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    referencing = await skill_repository.count_referencing_projects(db, skill_id)
    if referencing > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill is referenced by {referencing} project(s).",
        )
    await skill_repository.delete(db, skill_id)
    await db.commit()


async def reject(db: AsyncSession, skill_id: int, reassign_to_id: int | None) -> None:
    """Reject a pending skill: repoint its project links, then delete it.

    Args:
        db: Database session.
        skill_id: Pending skill to reject.
        reassign_to_id: Target skill for its project links, or None to drop them.

    Raises:
        HTTPException 404: Skill or target not found.
        HTTPException 400: Skill is not pending.
    """
    skill = await skill_repository.get_by_id(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    current = await statusable_repository.get_status(db, "fbf_skill", skill.id)
    if current is None or current.status.name != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending skills can be rejected")
    if reassign_to_id is not None:
        target = await skill_repository.get_by_id(db, reassign_to_id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target skill not found")
    await skill_repository.reassign_projects(db, skill_id, reassign_to_id)
    await skill_repository.delete(db, skill_id)
    await db.commit()

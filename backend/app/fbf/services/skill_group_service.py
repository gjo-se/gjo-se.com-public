"""Business logic for FBF skill groups (gjo_se_com)."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.fbf.repositories import skill_group_repository, skill_repository
from app.fbf.repositories.skill_group_repository import SkillGroupRef
from app.fbf.schemas.skill_schemas import (
    SkillGroupAdminOut,
    SkillGroupCreate,
    SkillGroupOut,
    SkillGroupReorderRequest,
    SkillGroupUpdate,
)
from app.shared.db_access.session_types import AsyncSession

FALLBACK_LOCALE = "de"


def _pick_group_label(labels: dict[str, str], locale: str) -> str:
    """Returns the group label matching ``locale``, falling back to German."""
    if locale in labels:
        return labels[locale]
    return labels.get(FALLBACK_LOCALE, "")


def _to_group_admin_out(
    group: SkillGroupRef,
    skill_count: int = 0,
) -> SkillGroupAdminOut:
    """Maps a group DTO to the admin DTO."""
    return SkillGroupAdminOut(
        id=group.id,
        sort=group.sort,
        priority=group.priority,
        labels=dict(group.labels),
        skill_count=skill_count,
    )


async def list_public_groups(db: AsyncSession, locale: str) -> list[SkillGroupOut]:
    """Return all curated skill groups as localized public DTOs, sorted by ``sort`` ASC.

    Args:
        db: Active async DB session.
        locale: Requested locale (``de`` or ``en``); falls back to ``de``.
    """
    groups = await skill_group_repository.get_public_groups(db)
    return [
        SkillGroupOut(
            id=group.id,
            sort=group.sort,
            priority=group.priority,
            label=_pick_group_label(group.labels, locale),
        )
        for group in groups
    ]


async def list_admin_groups(db: AsyncSession) -> list[SkillGroupAdminOut]:
    """Return all skill groups as admin DTOs with full DE/EN labels, sorted by ``sort`` ASC."""
    groups = await skill_group_repository.get_groups_with_translations(db)
    counts = await skill_repository.count_by_group_ids(db)
    return [_to_group_admin_out(group, counts.get(group.id, 0)) for group in groups]


async def update_group(
    db: AsyncSession,
    group_id: int,
    payload: SkillGroupUpdate,
) -> SkillGroupAdminOut:
    """Partially update a skill group; raises 404 for an unknown id.

    Args:
        db: Active async DB session.
        group_id: Die ``fbf_skill_group.id``.
        payload: Validierter Partial-Update-Payload.

    Returns:
        Die aktualisierte Gruppe als Admin-DTO.

    Raises:
        HTTPException 404: Wenn die Gruppe nicht existiert.
    """
    updates = payload.model_dump(exclude_unset=True)
    group = await skill_group_repository.update_group(
        db,
        group_id,
        sort=updates.get("sort"),
        priority=updates.get("priority"),
        labels=updates.get("labels"),
    )
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill group not found",
        )
    count = await skill_repository.count_by_group(db, group_id)
    return _to_group_admin_out(group, count)


async def create_group(
    db: AsyncSession,
    payload: SkillGroupCreate,
) -> SkillGroupAdminOut:
    """Create a new skill group and return it as an admin DTO.

    Die neue Gruppe wird ans Ende der Reihenfolge angehaengt (``sort`` = max+1).
    """
    group = await skill_group_repository.create_group(
        db,
        labels=payload.labels,
        priority=payload.priority,
    )
    return _to_group_admin_out(group, 0)


async def reorder_groups(
    db: AsyncSession,
    payload: SkillGroupReorderRequest,
) -> int:
    """Set ``sort`` from ``ordered_ids`` (index = sort).

    Args:
        db: Active async DB session.
        payload: Validierter Reorder-Payload (Gruppen-IDs in Reihenfolge).

    Returns:
        Anzahl der Gruppen, deren ``sort`` aktualisiert wurde.
    """
    await skill_group_repository.reorder_groups(db, payload.ordered_ids)
    return len(payload.ordered_ids)


async def delete_group_guarded(db: AsyncSession, group_id: int) -> None:
    """Delete a skill group, refusing when skills still reference it.

    Args:
        db: Active async DB session.
        group_id: Die ``fbf_skill_group.id``.

    Raises:
        HTTPException 404: Wenn die Gruppe nicht existiert.
        HTTPException 409: Wenn noch Skills der Gruppe zugeordnet sind.
    """
    group = await skill_group_repository.get_group_by_id(db, group_id)
    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill group not found",
        )
    referencing = await skill_repository.count_by_group(db, group_id)
    if referencing > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill group is assigned to {referencing} skill(s).",
        )
    await skill_group_repository.delete_group(db, group_id)
    await db.commit()

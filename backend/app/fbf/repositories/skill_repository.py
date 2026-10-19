"""Database access for FBF skill entries (gjo_se_com).

Core skill-aggregate reads plus the group-relative ``update`` sort logic. The
split-out skill repositories (``skill_base``, ``skill_list``, ``skill_write``,
``skill_link``, ``skill_stats``) are re-exported here so consumers keep importing
``app.fbf.repositories.skill_repository`` unchanged.
"""

from __future__ import annotations

from collections.abc import Mapping

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.repositories.skill_board_repository import get_board_page
from app.fbf.repositories.skill_cv_repository import (
    CvSkillRow,
    count_for_project,
    get_cv_skill_rows,
)
from app.fbf.repositories.skill_link_repository import (
    get_public_project_skills,
    get_scored_skills,
)
from app.fbf.repositories.skill_read_repository import (
    SkillFilter,
    SkillRef,
    avg_importance_lookup,
    count_filtered,
    effective_links_select,
    effective_master_id,
    get_paginated_with_counts,
    skill_status_filter,
    skill_tag_filter,
    skill_text_filter,
    to_skill_ref,
)
from app.fbf.repositories.skill_stats_repository import (
    get_active_skill_ids,
    get_confirmed_skills_below_level,
    get_master_project_ids_for_skill_since,
    get_master_skill_project_pairs_since,
    get_ranked_skills,
    get_trend_points,
)
from app.fbf.repositories.skill_write_repository import (
    create,
    delete,
    reassign_projects,
    reorder_skills,
    set_canonical_id,
    set_vector,
)
from app.shared.status.models.status import Status, Statusable

__all__ = [
    "CvSkillRow",
    "SkillFilter",
    "SkillRef",
    "avg_importance_lookup",
    "count_by_group",
    "count_by_group_ids",
    "count_filtered",
    "count_for_project",
    "count_masters",
    "count_referencing_projects",
    "count_slaves",
    "create",
    "delete",
    "effective_links_select",
    "effective_master_id",
    "get_active_skill_ids",
    "get_board_page",
    "get_by_id",
    "get_by_ids",
    "get_by_name",
    "get_confirmed",
    "get_confirmed_skills_below_level",
    "get_cv_skill_rows",
    "get_master_project_ids_for_skill_since",
    "get_master_skill_project_pairs_since",
    "get_name_id_mapping",
    "get_paginated_with_counts",
    "get_public_profile_skills",
    "get_public_project_skills",
    "get_ranked_skills",
    "get_scored_skills",
    "get_skills_with_vectors",
    "get_skills_without_vector",
    "get_slaves",
    "get_slaves_with_vectors",
    "get_trend_points",
    "next_sort_for_group",
    "reassign_projects",
    "reorder_skills",
    "set_canonical_id",
    "set_vector",
    "skill_status_filter",
    "skill_tag_filter",
    "skill_text_filter",
    "to_skill_ref",
    "update",
]


async def get_name_id_mapping(db: AsyncSession) -> dict[str, int]:
    """Return ``{lower(name): id}`` for all non-blacklisted skills.

    Used by the text-backfill path to efficiently resolve matched substrings
    to Skill primary keys without per-match queries. Blacklisted skills
    are excluded so they cannot be re-linked via substring matching.
    """
    result = await db.execute(
        select(Skill.id, Skill.name).where(
            Skill.id.not_in(
                select(Statusable.statusable_id)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == "fbf_skill",
                    Status.name == "blacklisted",
                )
            )
        ),
    )
    return {row.name.lower(): row.id for row in result.all()}


async def get_confirmed(db: AsyncSession) -> list[SkillRef]:
    """Return all confirmed MASTER skills ordered by name (no slaves) as DTOs."""
    result = await db.execute(
        select(Skill)
        .where(
            Skill.id.in_(
                select(Statusable.statusable_id)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == "fbf_skill",
                    Status.name == "active",
                )
            ),
            Skill.canonical_id.is_(None),
        )
        .order_by(Skill.name)
    )
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_by_id(db: AsyncSession, skill_id: int) -> SkillRef | None:
    """Return a single skill by primary key as DTO."""
    row = await db.get(Skill, skill_id)
    return to_skill_ref(row) if row is not None else None


async def get_by_ids(db: AsyncSession, skill_ids: list[int]) -> list[SkillRef]:
    """Return all skills whose primary key is in ``skill_ids`` as DTOs."""
    if not skill_ids:
        return []
    result = await db.execute(select(Skill).where(Skill.id.in_(skill_ids)))
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_by_name(db: AsyncSession, name: str) -> SkillRef | None:
    """Return a skill by unique name as DTO."""
    result = await db.execute(select(Skill).where(Skill.name == name))
    row = result.scalar_one_or_none()
    return to_skill_ref(row) if row is not None else None


async def next_sort_for_group(db: AsyncSession, group_id: int) -> int:
    """Return the next free group-relative ``sort`` value (append at the end)."""
    result = await db.execute(select(func.coalesce(func.max(Skill.sort), -1) + 1).where(Skill.group_id == group_id))
    return int(result.scalar_one())


async def update(
    db: AsyncSession,
    skill_id: int,
    changes: Mapping[str, object],
    *,
    previous_group_id: int | None = None,
) -> SkillRef | None:
    """Apply scalar changes to an existing skill and return its DTO.

    On a group change ``sort`` (group-relative index, partial unique index
    ``(group_id, sort)``) is reset: appended at the end of the target group or
    set to ``NULL`` when the group is cleared. Without this the previous sort
    value collides with an existing skill of the target group.

    Args:
        db: Active async DB session.
        skill_id: The ``fbf_skill.id``.
        changes: Scalar column changes (already filtered by the caller).
        previous_group_id: The skill's group id before the update.

    Returns:
        The updated skill as DTO, or ``None`` when it does not exist.
    """
    skill = await db.get(Skill, skill_id)
    if skill is None:
        return None
    for key, value in changes.items():
        setattr(skill, key, value)
    if skill.group_id != previous_group_id:
        skill.sort = await next_sort_for_group(db, skill.group_id) if skill.group_id is not None else None
    await db.flush()
    await db.refresh(skill)
    return to_skill_ref(skill)


async def get_skills_without_vector(db: AsyncSession) -> list[SkillRef]:
    """Return all skills whose ``vector`` is still NULL as DTOs."""
    result = await db.execute(select(Skill).where(Skill.vector.is_(None)))
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_slaves(db: AsyncSession, master_id: int) -> list[SkillRef]:
    """Return all skills whose ``canonical_id`` points at ``master_id`` as DTOs."""
    result = await db.execute(select(Skill).where(Skill.canonical_id == master_id))
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_skills_with_vectors(
    db: AsyncSession,
    *,
    canonical_id_is_none: bool | None = None,
    require_group: bool = False,
    exclude_archived: bool = True,
) -> list[SkillRef]:
    """Return skills that carry a non-NULL embedding vector, optionally filtered.

    Args:
        db: Active async DB session.
        canonical_id_is_none: ``True`` = masters only, ``False`` = slaves only,
            ``None`` = both.
        require_group: Restrict to skills assigned to a curated group.
        exclude_archived: Exclude skills whose core status is ``deprecated``.

    Returns:
        The matching skills as DTOs.
    """
    stmt = select(Skill).where(Skill.vector.isnot(None))
    if canonical_id_is_none is not None:
        if canonical_id_is_none:
            stmt = stmt.where(Skill.canonical_id.is_(None))
        else:
            stmt = stmt.where(Skill.canonical_id.isnot(None))
    if require_group:
        stmt = stmt.where(Skill.group_id.isnot(None))
    if exclude_archived:
        archived_subq = (
            select(Statusable.statusable_id)
            .join(Status, Status.id == Statusable.status_id)
            .where(
                Statusable.statusable_type == "fbf_skill",
                Status.name == "deprecated",
            )
        ).scalar_subquery()
        stmt = stmt.where(Skill.id.not_in(archived_subq))
    result = await db.execute(stmt)
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_slaves_with_vectors(db: AsyncSession, master_ids: list[int]) -> list[SkillRef]:
    """Return vector-carrying skills whose ``canonical_id`` is in ``master_ids``.

    Args:
        db: Active async DB session.
        master_ids: Master ids whose slaves are loaded.

    Returns:
        The matching slave skills as DTOs.
    """
    if not master_ids:
        return []
    result = await db.execute(
        select(Skill).where(
            Skill.canonical_id.in_(master_ids),
            Skill.vector.isnot(None),
        )
    )
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_public_profile_skills(db: AsyncSession) -> list[SkillRef]:
    """Return public profile skills (``level_public > 0``, ``active``) by name.

    Public read path for the profile skills list: only skills with a positive
    public level and an ``active`` core status, ordered by name.

    Args:
        db: Active async DB session.

    Returns:
        The matching skills as DTOs.
    """
    confirmed_subq = (
        select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == "active",
        )
    ).scalar_subquery()
    result = await db.execute(
        select(Skill)
        .where(
            Skill.level_public > 0,
            Skill.id.in_(confirmed_subq),
        )
        .order_by(Skill.name.asc())
    )
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def count_masters(db: AsyncSession, *, active_only: bool = False) -> int:
    """Return the number of master skills (``canonical_id IS NULL``).

    Args:
        db: Active async DB session.
        active_only: When True, only masters whose core status is ``active``.

    Returns:
        Number of matching master skills.
    """
    stmt = select(func.count()).select_from(Skill).where(Skill.canonical_id.is_(None))
    if active_only:
        stmt = stmt.where(
            Skill.id.in_(
                select(Statusable.statusable_id)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == "fbf_skill",
                    Status.name == "active",
                )
            )
        )
    result = await db.execute(stmt)
    return result.scalar_one()


async def count_referencing_projects(db: AsyncSession, skill_id: int) -> int:
    """Return the number of ``project_skill`` links referencing this skill."""
    result = await db.execute(select(func.count()).select_from(ProjectSkill).where(ProjectSkill.skill_id == skill_id))
    return result.scalar_one()


async def count_slaves(db: AsyncSession, skill_id: int) -> int:
    """Return the number of skills whose ``canonical_id`` points at ``skill_id``."""
    result = await db.execute(select(func.count()).select_from(Skill).where(Skill.canonical_id == skill_id))
    return result.scalar_one()


async def count_by_group(db: AsyncSession, group_id: int) -> int:
    """Return the number of skills currently assigned to a skill group.

    Owner-side read: the Skill aggregate owns ``Skill.group_id``; the skill-group
    lifecycle asks the Skill owner instead of reaching into the foreign
    aggregate.

    Args:
        db: Active async DB session.
        group_id: Die ``fbf_skill_group.id``.

    Returns:
        Anzahl der ``fbf_skill``-Zeilen mit ``group_id`` == ``group_id``.
    """
    result = await db.execute(select(func.count()).select_from(Skill).where(Skill.group_id == group_id))
    return result.scalar_one()


async def count_by_group_ids(db: AsyncSession) -> dict[int, int]:
    """Return ``group_id -> skill count`` for all assigned skills.

    Batch variant of :func:`count_by_group`; groups without skills are absent.

    Args:
        db: Active async DB session.

    Returns:
        ``{group_id: count}`` – nur Gruppen mit mind. einem Skill.
    """
    result = await db.execute(
        select(Skill.group_id, func.count()).where(Skill.group_id.isnot(None)).group_by(Skill.group_id)
    )
    rows = result.all()
    return {group_id: count for group_id, count in rows if group_id is not None}

"""Skill-side reads for the FBF skill-analysis charts (gjo_se_com).

Owns the ranking/statistics projections behind the radar/bar charts, the trend
curves and the impact/swing simulations. Split out of ``skill_repository``; the
shared master-resolution expressions live in ``skill_read_repository``.
"""

from __future__ import annotations

import datetime
from typing import Any

from sqlalchemy import Select, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.repositories import project_repository
from app.fbf.repositories.skill_read_repository import (
    SkillRef,
    effective_master_id,
    to_skill_ref,
)
from app.fbf.schemas.chart_schemas import TrendPointOut
from app.shared.status.models.status import Status, Statusable


def _skill_ids_for_job_role_select(role_id: int) -> Select[Any]:
    """Skill-resolving select of skills linked to masters of a job role.

    Links are resolved to MASTER skills (V2 dedup): a slave link qualifies its
    master for the role, never the slave itself. The project-side filter is
    embedded from :func:`project_repository.master_project_ids_for_job_role_select`
    so this repository never imports the foreign ``Project`` model.

    Args:
        role_id: Job role id (``JobRole.id``).

    Returns:
        Select of effective master skill ids for the role.
    """
    return (
        select(effective_master_id())
        .select_from(ProjectSkill)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .where(ProjectSkill.project_id.in_(project_repository.master_project_ids_for_job_role_select(role_id)))
    )


async def get_ranked_skills(
    db: AsyncSession,
    *,
    top_n: int,
    role_id: int | None = None,
) -> list[SkillRef]:
    """Return the Top-N canonical skills by ``importance`` (NULLs last), name ASC.

    Serves the radar/bar analysis charts. When ``role_id`` is set, only skills
    linked to master projects of that job role are considered.

    Args:
        db: Active async DB session.
        top_n: Maximum number of skills (axes/bars).
        role_id: Optional job role filter (``JobRole.id``).

    Returns:
        The ranked skills as DTOs.
    """
    stmt = select(Skill).order_by(Skill.importance.desc().nullslast(), Skill.name).limit(top_n)
    if role_id is not None:
        stmt = stmt.where(Skill.id.in_(_skill_ids_for_job_role_select(role_id)))
    result = await db.execute(stmt)
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_trend_points(
    db: AsyncSession,
    *,
    skill_ids: list[int],
    window: str,
    role_id: int | None = None,
) -> list[TrendPointOut]:
    """Return the relative skill frequency per time window (on-the-fly).

    For each ``date_trunc(window, posted_at)`` bucket, computes the share of
    master projects mentioning a tracked skill relative to all master projects
    in that bucket. Links are resolved to MASTER skills (V2 dedup). Only masters
    with a ``posted_at`` are counted; an optional ``role_id`` restricts the
    master population.

    Args:
        db: Active async DB session.
        skill_ids: Canonical skill ids to track.
        window: ``date_trunc`` unit (whitelisted by the caller).
        role_id: Optional job role filter (``JobRole.id``).

    Returns:
        Trend points ordered by ``window_start`` then ``skill_name``.
    """
    masters = project_repository.master_projects_posted_at_select(role_id).subquery()
    bucket = func.date_trunc(window, masters.c.posted_at).label("window_start")

    totals_stmt = select(
        bucket,
        func.count(distinct(masters.c.project_id)).label("total"),
    ).group_by(bucket)
    totals = {row.window_start: row.total for row in (await db.execute(totals_stmt)).all()}
    if not totals:
        return []

    effective_id = effective_master_id().label("master_skill_id")
    master_skill = aliased(Skill)
    counts_stmt = (
        select(
            bucket,
            master_skill.name.label("skill_name"),
            func.count(distinct(masters.c.project_id)).label("hits"),
        )
        .select_from(masters)
        .join(ProjectSkill, ProjectSkill.project_id == masters.c.project_id)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .join(master_skill, master_skill.id == effective_id)
        .where(effective_id.in_(skill_ids))
        .group_by(bucket, master_skill.name)
        .order_by(bucket, master_skill.name)
    )

    points: list[TrendPointOut] = []
    for row in (await db.execute(counts_stmt)).all():
        total = totals.get(row.window_start, 0)
        if total == 0:
            continue
        points.append(
            TrendPointOut(
                window_start=row.window_start,
                skill_name=row.skill_name,
                relative_frequency=row.hits / total,
            )
        )
    return points


async def get_master_skill_project_pairs_since(
    db: AsyncSession,
    cutoff: datetime.datetime,
) -> list[tuple[int, int]]:
    """Return ``(project_id, master_skill_id)`` links for masters since a cutoff.

    Serves the impact simulation: master-resolved ``project_skill`` links of
    master projects posted within the look-back window.

    Args:
        db: Active async DB session.
        cutoff: Lower bound (inclusive) on the master's ``posted_at``.

    Returns:
        List of ``(project_id, master_skill_id)`` pairs.
    """
    masters = project_repository.master_projects_posted_at_select().subquery()
    effective_id = effective_master_id().label("master_skill_id")
    stmt = (
        select(ProjectSkill.project_id, effective_id)
        .select_from(masters)
        .join(ProjectSkill, ProjectSkill.project_id == masters.c.project_id)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .where(masters.c.posted_at >= cutoff)
    )
    result = await db.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def get_confirmed_skills_below_level(
    db: AsyncSession,
    target_level: int,
) -> list[SkillRef]:
    """Return active skills whose ``level`` is below ``target_level``.

    Serves the swing/delta simulations. Skills without a curated level count as
    level 0. Ordered by ``importance`` DESC (NULLs last).

    Args:
        db: Active async DB session.
        target_level: Simulated target knowledge level (0–5).

    Returns:
        The matching confirmed skills as DTOs.
    """
    confirmed_subq = (
        select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == "active",
        )
    ).scalar_subquery()
    stmt = (
        select(Skill)
        .where(
            Skill.id.in_(confirmed_subq),
            func.coalesce(Skill.level, 0) < target_level,
        )
        .order_by(Skill.importance.desc().nullslast())
    )
    result = await db.execute(stmt)
    return [to_skill_ref(skill) for skill in result.scalars().all()]


async def get_master_project_ids_for_skill_since(
    db: AsyncSession,
    skill_id: int,
    cutoff: datetime.datetime,
) -> list[int]:
    """Return master project ids linked to ``skill_id`` (master-resolved) since a cutoff.

    Serves the swing/delta simulations: the distinct master projects posted in
    the look-back window whose link resolves to the given master skill.

    Args:
        db: Active async DB session.
        skill_id: Effective master skill id.
        cutoff: Lower bound (inclusive) on the master's ``posted_at``.

    Returns:
        Distinct master project ids.
    """
    masters = project_repository.master_projects_posted_at_select().subquery()
    stmt = (
        select(func.distinct(ProjectSkill.project_id))
        .select_from(masters)
        .join(ProjectSkill, ProjectSkill.project_id == masters.c.project_id)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .where(
            effective_master_id() == skill_id,
            masters.c.posted_at >= cutoff,
        )
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def get_active_skill_ids(db: AsyncSession) -> list[int]:
    """Return the ids of all active (``status='active'``) skills.

    Serves the trend-all cache computation (all confirmed skills tracked).

    Args:
        db: Active async DB session.

    Returns:
        List of skill ids whose core status is ``active``.
    """
    active_subq = (
        select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == "active",
        )
    ).scalar_subquery()
    result = await db.execute(select(Skill.id).where(Skill.id.in_(active_subq)))
    return [row[0] for row in result.all()]

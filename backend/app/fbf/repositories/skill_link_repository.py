"""Scored project↔skill reads for FBF skills (gjo_se_com).

Resolves ``project_skill`` junction rows to their effective master skill and
returns each master together with the per-project and global-average importance
that feed the match-score and the public Proof blend. The shared
master-resolution expressions live in ``skill_read_repository``; the raw junction
rows are owned by ``project_skill_repository``.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.repositories.skill_read_repository import (
    SkillRef,
    avg_importance_lookup,
    effective_links_select,
    skill_status_filter,
    to_skill_ref,
)
from app.shared.status.models.status import Status, Statusable


async def get_scored_skills(
    db: AsyncSession,
    project_id: int,
    *,
    status: str | None = None,
) -> list[tuple[SkillRef, float | None, float | None, str | None]]:
    """Return the MASTER skills linked to a project with both project and
    global-average importance.

    Serves the match-score calculation.  Links pointing at slaves are resolved
    to their master; duplicates collapse to one row.  Ordered by curated
    ``importance`` DESC (NULLs last) then ``name``.

    Args:
        db: gjo_se_com database session.
        project_id: Master project primary key.
        status: Optional status filter value. When ``None`` (default), all non-blacklisted
            skills are returned.

    Returns:
        List of ``(Skill, project_importance, avg_importance, status_name)`` tuples.
        ``project_importance`` is the per-project LLM estimate (NULL when
        none exists).  ``avg_importance`` is the global average across ALL
        projects for this skill (NULL when the skill never appeared).
        ``status_name`` is the Status name (NULL when no status is assigned).
    """
    # Global average importance per master skill (across all projects)
    avg_lookup = avg_importance_lookup()

    # Per-project links for this specific project
    links = effective_links_select().where(ProjectSkill.project_id == project_id).subquery()

    stmt = (
        select(
            Skill,
            links.c.importance.label("project_importance"),
            avg_lookup.c.avg_importance,
            Status.name.label("status_name"),
        )
        .join(links, links.c.master_skill_id == Skill.id)
        .outerjoin(avg_lookup, avg_lookup.c.master_skill_id == Skill.id)
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "fbf_skill") & (Statusable.statusable_id == Skill.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
    )
    stmt = skill_status_filter(stmt, status)
    stmt = stmt.order_by(Skill.importance.desc().nullslast(), Skill.name)

    result = await db.execute(stmt)
    return [
        (to_skill_ref(row.Skill), row.project_importance, row.avg_importance, row.status_name) for row in result.all()
    ]


async def get_public_project_skills(
    db: AsyncSession,
    project_id: int,
) -> list[tuple[SkillRef, float | None, float | None]]:
    """Return the MASTER skills linked to a project with the blend inputs.

    Public read path for the Proof-Match-Sektion. Only ``active`` skills are
    returned (``blacklisted``/``pending``/``archived`` are excluded). Links
    pointing at slaves are resolved to their master; duplicates collapse to one
    row. Returns the per-project LLM estimate **and** the global average so the
    caller can compute the single blended ``effective_importance``.

    Args:
        db: gjo_se_com database session.
        project_id: Project primary key.

    Returns:
        List of ``(Skill, project_importance, avg_importance)`` tuples where
        ``project_importance`` is the per-project LLM estimate and
        ``avg_importance`` the global average across all projects (both NULL
        when no data exists).
    """
    # Only skills whose current core status is ``active``
    active_subq = (
        select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == "active",
        )
    ).scalar_subquery()

    # Per-project links for this specific project (master-resolved, blacklisted excluded)
    links = effective_links_select().where(ProjectSkill.project_id == project_id).subquery()

    # Global average importance per master skill (shared with get_scored_skills)
    avg_lookup = avg_importance_lookup()

    stmt = (
        select(
            Skill,
            links.c.importance.label("project_importance"),
            avg_lookup.c.avg_importance,
        )
        .join(links, links.c.master_skill_id == Skill.id)
        .outerjoin(avg_lookup, avg_lookup.c.master_skill_id == Skill.id)
        .where(Skill.id.in_(active_subq))
        .order_by(links.c.importance.desc().nullslast(), Skill.name)
    )

    result = await db.execute(stmt)
    return [(to_skill_ref(row.Skill), row.project_importance, row.avg_importance) for row in result.all()]

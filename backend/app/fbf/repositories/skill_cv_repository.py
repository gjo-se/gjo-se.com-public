"""CV skill selection reads for FBF skills (gjo_se_com).

Resolves ``project_skill`` junction rows to their effective master skill and
returns the per-link CV rows (original name + master group/level/label) plus the
distinct master count. The shared master-resolution expression lives in
``skill_read_repository``.
"""

from __future__ import annotations

from typing import NamedTuple

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.models.skill_group import SkillGroup
from app.fbf.models.skill_group_translation import SkillGroupTranslation
from app.fbf.repositories.skill_read_repository import effective_master_id
from app.shared.status.models.status import Status, Statusable

# Mindest-``level_public`` (0–5) eines Masters, damit ein Skill im CV erscheint.
_MIN_PUBLIC_LEVEL = 3


class CvSkillRow(NamedTuple):
    """Lightweight row for the CV skill selection (see :func:`get_cv_skill_rows`).

    Attributes:
        skill_id: Original ``fbf_skill.id`` the project link points at.
        original_name: Name of the original (extraction) skill – the display name.
        level_public: Public knowledge level of the master (0–5).
        group_id: Curated group id of the master (never ``None`` here).
        group_sort: Group order (``fbf_skill_group.sort``).
        group_label: Localized (``de``) group label.
    """

    skill_id: int
    original_name: str
    level_public: int | None
    group_id: int | None
    group_sort: int | None
    group_label: str | None


async def get_cv_skill_rows(db: AsyncSession, project_id: int) -> list[CvSkillRow]:
    """CV-Skill-Links – Original-Name + Master-Gruppe/Niveau/Status, gefiltert
    auf active / ``level_public >= 3`` / mit Gruppe.

    ``importance`` spielt **keine Rolle** – weder für die Sichtbarkeit noch für
    die Reihenfolge: was dem Projekt verlinkt ist, erscheint. Es findet **kein**
    Per-Master-Dedup statt; jede verlinkte Zeile wird zurückgegeben.

    Resolves each link's **master** (``coalesce(canonical_id, id)``) but keeps
    the **original** skill name (the display name the extraction produced).
    Unlike :func:`effective_links_select`, no importance averaging is applied.
    Ordered by ``skill_id ASC`` (deterministic).

    Args:
        db: gjo_se_com database session.
        project_id: Master project primary key.

    Returns:
        List of :class:`CvSkillRow` for the CV skill selection.
    """
    # Only skills whose current core status is ``active`` – evaluated on the master.
    active_subq = (
        select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == "active",
        )
    ).scalar_subquery()

    master = aliased(Skill, name="m")

    stmt = (
        select(
            ProjectSkill.skill_id.label("skill_id"),
            Skill.name.label("original_name"),
            master.level_public.label("level_public"),
            master.group_id.label("group_id"),
            SkillGroup.sort.label("group_sort"),
            SkillGroupTranslation.label.label("group_label"),
        )
        .select_from(ProjectSkill)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .join(master, master.id == effective_master_id())
        .outerjoin(SkillGroup, SkillGroup.id == master.group_id)
        .outerjoin(
            SkillGroupTranslation,
            (SkillGroupTranslation.skill_group_id == SkillGroup.id) & (SkillGroupTranslation.locale == "de"),
        )
        .where(
            ProjectSkill.project_id == project_id,
            master.id.in_(active_subq),
            master.level_public >= _MIN_PUBLIC_LEVEL,
            master.group_id.is_not(None),
        )
        .order_by(ProjectSkill.skill_id.asc())
    )

    result = await db.execute(stmt)
    return [
        CvSkillRow(
            skill_id=row.skill_id,
            original_name=row.original_name,
            level_public=row.level_public,
            group_id=row.group_id,
            group_sort=row.group_sort,
            group_label=row.group_label,
        )
        for row in result.all()
    ]


async def count_for_project(db: AsyncSession, project_id: int) -> int:
    """Return the number of distinct MASTER skills linked to a project.

    Consistent with :func:`get_scored_skills`: slave links resolve to their
    master, so master+slave pairs count once.

    Args:
        db: gjo_se_com database session.
        project_id: Master project primary key.

    Returns:
        Count of distinct resolved master skills for the project.
    """
    stmt = (
        select(func.count(distinct(effective_master_id())))
        .select_from(ProjectSkill)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .where(ProjectSkill.project_id == project_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()

"""Shared skill read primitives and filtered skill listings (gjo_se_com).

Hosts the read DTO (``SkillRef``), the filter DTO (``SkillFilter``) and the
search/status/tag filter builders, together with the filtered count, the
paginated list-with-counts and the dedup board page. Split out of
``skill_repository`` so that the writers, the link reader and the ranking reads
stay separate concerns; the other skill repositories import these primitives
from here (``skill_repository`` re-exports them for stable consumer imports).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import (
    ColumnElement,
    Select,
    String,
    asc,
    cast,
    desc,
    func,
    or_,
    select,
)
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.selectable import Subquery

from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.repositories import project_repository
from app.shared.status.models.status import Status, Statusable
from app.shared.tagging.models.tag import Tag, Taggable
from app.shared.tagging.schemas.tag_schemas import TagOut

_SORTABLE_COLUMNS: dict[str, Any] = {
    "id": Skill.id,
    "name": Skill.name,
    "importance": Skill.importance,
    "level": Skill.level,
    "level_public": Skill.level_public,
}
_DEFAULT_SORT = "name"


@dataclass(frozen=True)
class SkillFilter:
    """Search/filter criteria shared by the skill list, count and board queries."""

    q: str | None = None
    status: str | None = None
    tag: str | None = None
    master_filter: str | None = None
    min_importance: float | None = None
    min_level: float | None = None
    min_level_public: float | None = None
    min_avg_project_importance: float | None = None
    group_id: int | None = None


@dataclass(frozen=True)
class SkillRef:
    """Read DTO for a skill: the service-boundary type (never the ORM model).

    Carries the scalar fields the service layer composes with, so services stay
    free of ``app.fbf.models`` imports (Achse 2: ``services`` > ``repositories``).
    """

    id: int
    name: str
    description: str | None = None
    importance: int | None = None
    level: int | None = None
    level_public: int | None = None
    canonical_id: int | None = None
    group_id: int | None = None
    sort: int | None = None
    vector: list[float] | None = None
    # Core-Tags (``shared_taggable``/``shared_tag``, lazy="selectin" am Modell).
    # ``compare=False``: die Identität eines Skills hängt nicht an seinen Tags.
    tags: list[TagOut] = field(default_factory=list, compare=False)


def to_skill_ref(skill: Skill) -> SkillRef:
    """Maps a skill ORM row to its read DTO.

    Args:
        skill: Persisted ORM row (tags are eager-loaded via ``lazy="selectin"``).

    Returns:
        The read DTO handed to the service layer.
    """
    # Read ``tags`` only when already loaded: a freshly flushed row (``db.get``
    # hitting the identity map) has no ``lazy="selectin"`` tags yet, so touching
    # the attribute would fire a sync SELECT from async code (MissingGreenlet).
    # ``unloaded`` is absent for non-ORM stand-ins (no state to inspect) → those
    # fall back to ``getattr``; eager-loading query paths hand over loaded tags.
    state = sa_inspect(skill, raiseerr=False)
    unloaded = getattr(state, "unloaded", None)
    skill_tags: list[Tag] | None = None if unloaded and "tags" in unloaded else getattr(skill, "tags", None)
    return SkillRef(
        id=skill.id,
        name=skill.name,
        description=skill.description,
        importance=skill.importance,
        level=skill.level,
        level_public=skill.level_public,
        canonical_id=skill.canonical_id,
        group_id=skill.group_id,
        sort=skill.sort,
        vector=skill.vector,
        tags=[TagOut.model_validate(tag) for tag in (skill_tags or [])],
    )


def skill_text_filter(stmt: Select[Any], q: str | None) -> Select[Any]:
    """Adds the shared skill search-text filter (name/ID ILIKE) to a statement.

    Args:
        stmt: SQLAlchemy Select over ``Skill``.
        q: Search term; numeric terms also match the ID.

    Returns:
        The statement with the text filter applied (unchanged when ``q`` is empty).
    """
    if not q:
        return stmt
    name_filter = Skill.name.ilike(f"%{q}%")
    id_filter = cast(Skill.id, String).ilike(f"%{q}%")
    return stmt.where(or_(name_filter, id_filter)) if q.isdigit() else stmt.where(name_filter)


def skill_status_filter(stmt: Select[Any], status: str | None) -> Select[Any]:
    """Adds the shared skill status filter (EXISTS subquery) to a statement.

    Args:
        stmt: SQLAlchemy Select over ``Skill``.
        status: Curation status name; skipped when falsy.

    Returns:
        The statement with the status filter applied.
    """
    if not status:
        return stmt
    status_subq = (
        select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == status,
        )
    ).scalar_subquery()
    return stmt.where(Skill.id.in_(status_subq))


def skill_tag_filter(stmt: Select[Any], tag: str | None) -> Select[Any]:
    """Adds the shared skill tag filter (EXISTS subquery) to a statement.

    Args:
        stmt: SQLAlchemy Select over ``Skill``.
        tag: Tag name; skipped when falsy.

    Returns:
        The statement with the tag filter applied.
    """
    if not tag:
        return stmt
    tag_subq = (
        select(Taggable.taggable_id)
        .join(Tag, Tag.id == Taggable.tag_id)
        .where(
            Taggable.taggable_type == "fbf_skill",
            Tag.name == tag,
        )
    ).scalar_subquery()
    return stmt.where(Skill.id.in_(tag_subq))


def _apply_filters(stmt: Select[Any], filters: SkillFilter) -> Select[Any]:
    """Applies search-text, status, tag, master/slave, min-score, and group filters.

    Args:
        stmt: SQLAlchemy Select statement.
        filters: Bundled skill filter criteria.

    Returns:
        Filtered statement.
    """
    stmt = skill_text_filter(stmt, filters.q)
    stmt = skill_status_filter(stmt, filters.status)
    stmt = skill_tag_filter(stmt, filters.tag)
    if filters.master_filter == "masters":
        slave_of = select(Skill.canonical_id).where(Skill.canonical_id.is_not(None)).subquery()
        stmt = stmt.where(Skill.id.in_(select(slave_of)), Skill.canonical_id.is_(None))
    elif filters.master_filter == "slaves":
        stmt = stmt.where(Skill.canonical_id.isnot(None))
    if filters.min_importance is not None:
        stmt = stmt.where(Skill.importance >= filters.min_importance)
    if filters.min_level is not None:
        stmt = stmt.where(Skill.level >= filters.min_level)
    if filters.min_level_public is not None:
        stmt = stmt.where(Skill.level_public >= filters.min_level_public)
    if filters.group_id is not None:
        stmt = stmt.where(Skill.group_id == filters.group_id)
    return stmt


def effective_master_id() -> ColumnElement[int]:
    """SSOT resolution expression: master id of a linked skill.

    Slaves resolve to their master (``canonical_id``), masters to themselves.
    Requires ``Skill`` to be joined on ``ProjectSkill.skill_id``.
    """
    return func.coalesce(Skill.canonical_id, Skill.id)


def avg_importance_lookup() -> Subquery:
    """Global average importance per master skill (across all projects).

    Single shared subquery for both the match-score and the public Proof path:
    the average is computed from the same master-resolved links as
    :func:`effective_links_select` (blacklisted excluded), so the blend
    ``effective_importance`` always draws on identical inputs.
    """
    avg_sub = effective_links_select().subquery()
    return (
        select(
            avg_sub.c.master_skill_id,
            func.avg(avg_sub.c.importance).label("avg_importance"),
        )
        .group_by(avg_sub.c.master_skill_id)
        .subquery()
    )


def effective_links_select() -> Select[Any]:
    """Master-resolved (project_id, master_skill_id, importance) link triples.

    Groups raw ``project_skill`` rows by effective master ID and returns the
    **average** importance per master. Unlike the previous DISTINCT variant,
    this guarantees exactly one row per (project, master) pair — even when
    multiple slaves of the same master carry different importance values.

    Links to blacklisted skills are excluded — they must not influence the
    match score or the global importance average.
    """
    return (
        select(
            ProjectSkill.project_id.label("project_id"),
            effective_master_id().label("master_skill_id"),
            func.avg(ProjectSkill.importance).label("importance"),
        )
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .where(
            Skill.id.not_in(
                select(Statusable.statusable_id)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == "fbf_skill",
                    Status.name == "blacklisted",
                )
            )
        )
        .group_by(ProjectSkill.project_id, effective_master_id())
    )


async def count_filtered(db: AsyncSession, filters: SkillFilter) -> int:
    """Returns the number of matching skills.

    For min_avg_project_importance we need the same JOIN+HAVING as the list query,
    since avg_importance is a computed aggregate.
    """
    if filters.min_avg_project_importance is not None:
        resolved = (
            select(
                ProjectSkill.project_id,
                effective_master_id().label("master_skill_id"),
                ProjectSkill.importance,
            )
            .join(Skill, Skill.id == ProjectSkill.skill_id)
            .subquery()
        )
        avg_importance = func.avg(resolved.c.importance)
        stmt = (
            select(Skill.id, func.count(func.distinct(resolved.c.project_id)), avg_importance)
            .outerjoin(resolved, Skill.id == resolved.c.master_skill_id)
            .group_by(Skill.id)
            .having(avg_importance >= filters.min_avg_project_importance)
        )
        stmt = _apply_filters(stmt, filters)
        # Wrap in count subquery
        count_stmt = select(func.count()).select_from(stmt.subquery())
        result = await db.execute(count_stmt)
        return result.scalar_one()

    stmt = select(func.count()).select_from(Skill)
    stmt = _apply_filters(stmt, filters)
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_paginated_with_counts(
    db: AsyncSession,
    filters: SkillFilter,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "asc",
    masters_only: bool = False,
) -> list[tuple[SkillRef, int, float | None, str | None, str | None]]:
    """Returns paginated skills alongside master-resolved project count, avg importance, and status.

    Links are resolved through ``effective_master_id()`` (COALESCE(canonical_id, id))
    so that slaves aggregate into their master.  A slave without own links gets
    NULL; its master inherits all slave links.

    When *masters_only* is ``True`` only master projects (``canonical_id IS NULL``)
    are counted – slave/duplicate projects are excluded.
    """
    # Resolve every project_skill link to its effective master
    ps_join = Skill.__table__.join(ProjectSkill, Skill.id == ProjectSkill.skill_id)

    resolved = select(
        ProjectSkill.project_id,
        effective_master_id().label("master_skill_id"),
        ProjectSkill.importance,
    ).select_from(ps_join)
    if masters_only:
        resolved = resolved.where(ProjectSkill.project_id.in_(project_repository.master_project_ids_select()))
    resolved = resolved.subquery()

    project_count = func.count(func.distinct(resolved.c.project_id))
    avg_importance = func.avg(resolved.c.importance)

    # Sort by Skill column or computed aggregate
    computed_sort_fields = {"project_count", "avg_project_importance"}
    if sort_by in computed_sort_fields:
        order_expr = desc(project_count) if sort_order == "desc" else asc(project_count)
        if sort_by == "avg_project_importance":
            order_expr = desc(avg_importance) if sort_order == "desc" else asc(avg_importance)
    else:
        column = _SORTABLE_COLUMNS.get(sort_by, Skill.name)
        order_expr = desc(column) if sort_order == "desc" else asc(column)

    stmt = (
        select(
            Skill,
            project_count,
            avg_importance,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(resolved, resolved.c.master_skill_id == Skill.id)
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "fbf_skill") & (Statusable.statusable_id == Skill.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .group_by(Skill.id, Status.name, Status.color_token)
        .order_by(order_expr)
    )
    stmt = _apply_filters(stmt, filters)
    if filters.min_avg_project_importance is not None:
        stmt = stmt.having(avg_importance >= filters.min_avg_project_importance)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return [(to_skill_ref(row[0]), row[1], row[2], row[3], row[4]) for row in result.all()]

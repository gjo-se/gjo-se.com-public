"""Filter builders for normalised Project queries (AIScope domain).

Owns the shared ``ProjectFilter`` parameters, the correlated provenance
subquery and the filter predicates reused by the list, neighbour and count
reads. The sortable-column whitelist and ORDER BY builders live in
``project_sort_repository``.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy import String as SAString

from app.fbf.models.project import Project
from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.shared.status.models.status import Status, Statusable


@dataclass(frozen=True)
class ProjectFilter:
    """Filter parameters shared by ``get_all`` / ``get_neighbors`` / ``count``."""

    q: str | None = None
    search_term_id: int | None = None
    from_date: datetime.date | None = None
    to_date: datetime.date | None = None
    masters_only: bool = True
    status: str | None = None
    include_archived: bool = False
    min_score: float | None = None
    merged: bool | None = None
    has_skills: bool | None = None
    endcustomer: bool | None = None


def _freelancermap_id_subquery() -> Any:
    """Builds a correlated scalar subquery resolving the raw ProjectFreelancerMap
    primary key via the shared url.

    Powers the "Rohdaten anzeigen" link in the detail view, which points at the
    raw-dataset detail page (``/admin/fbf/raw/freelancermap/{freelancermap_id}``). ``None``
    when no raw entry exists (e.g. manually created end-customer masters)."""
    return (
        select(ProjectFreelancerMap.id)
        .where(ProjectFreelancerMap.url == Project.url)
        .correlate(Project)
        .limit(1)
        .scalar_subquery()
        .label("freelancermap_id")
    )


def _apply_filters(
    stmt: Select[Any],
    filters: ProjectFilter,
) -> Select[Any]:
    """Applies search-text, SearchTerm-provenance, date-range and status filters.

    Args:
        stmt: SQLAlchemy Select statement.
        filters: Project filter parameters (search text, provenance, dates,
            status/archive, score, merged, skills, endcustomer).

    Returns:
        Filtered statement.
    """
    if filters.masters_only:
        stmt = stmt.where(Project.canonical_id.is_(None))
    if filters.q:
        pattern = f"%{filters.q}%"
        stmt = stmt.where(
            or_(
                Project.title.ilike(pattern),
                Project.description.ilike(pattern),
                func.cast(Project.id, SAString).ilike(pattern),
            )
        )
    if filters.search_term_id is not None:
        provenance_urls = select(ProjectFreelancerMap.url).where(
            ProjectFreelancerMap.search_term_id == filters.search_term_id
        )
        stmt = stmt.where(Project.url.in_(provenance_urls))
    if filters.from_date is not None:
        stmt = stmt.where(Project.posted_at >= filters.from_date)
    if filters.to_date is not None:
        # Add 1 day: posted_at is timezone-aware, naive date comparison
        # misses the last day (e.g. "2026-07-02" → midnight UTC,
        # but project at 2026-07-02T08:00 UTC is AFTER midnight).
        stmt = stmt.where(Project.posted_at < filters.to_date + timedelta(days=1))
    stmt = _apply_status_filter(stmt, filters.status, filters.include_archived)
    if filters.min_score is not None:
        stmt = stmt.where(Project.match_score.is_not(None), Project.match_score >= filters.min_score)
    if filters.merged is True:
        stmt = stmt.where(Project.merged_at.is_not(None), Project.merged_description_de.is_not(None))
    elif filters.merged is False:
        stmt = stmt.where(Project.merged_at.is_(None))
    stmt = _apply_has_skills(stmt, filters.has_skills)
    if filters.endcustomer is not None:
        stmt = stmt.where(Project.endcustomer.is_(filters.endcustomer))
    return stmt


def _apply_status_filter(stmt: Select[Any], status: str | None, include_archived: bool) -> Select[Any]:
    """Apply exact-status or archived-exclusion filter (status takes precedence)."""
    if status is not None:
        status_subq = (
            select(Statusable.statusable_id)
            .join(Status, Status.id == Statusable.status_id)
            .where(
                Statusable.statusable_type == "project",
                Status.category == "project",
                Status.name == status,
            )
        ).scalar_subquery()
        return stmt.where(Project.id.in_(status_subq))
    if not include_archived:
        archived_subq = (
            select(Statusable.statusable_id)
            .join(Status, Status.id == Statusable.status_id)
            .where(
                Statusable.statusable_type == "project",
                Status.category == "project",
                Status.name == "archived",
            )
        ).scalar_subquery()
        return stmt.where(Project.id.not_in(archived_subq))
    return stmt


def _apply_has_skills(stmt: Select[Any], has_skills: bool | None) -> Select[Any]:
    """Filter to projects with/without linked skills (``None`` = no filter)."""
    if has_skills is None:
        return stmt
    from app.fbf.models.project_skill import ProjectSkill

    skill_project_ids = select(ProjectSkill.project_id).distinct()
    if has_skills:
        return stmt.where(Project.id.in_(skill_project_ids))
    return stmt.where(Project.id.not_in(skill_project_ids))

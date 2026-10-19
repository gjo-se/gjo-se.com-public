"""Sort builders for normalised Project queries (AIScope domain).

Owns the sortable-column whitelist, the default sort key and the correlated
scalar subqueries reused by the ORDER BY clauses. Split out of
``project_filter_repository`` so sorting and filtering stay separate
responsibilities (LCOM4).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Integer, asc, desc, func, select
from sqlalchemy.orm import aliased

from app.fbf.models.project import Project
from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.repositories import job_role_repository, search_term_repository

_SORTABLE_COLUMNS: dict[str, Any] = {
    "id": Project.id,
    "title": Project.title,
    "city": Project.city,
    "remote_percent": Project.remote_percent,
    "contract_type": Project.contract_type,
    "duration": func.cast(Project.duration, Integer),
    "start_date": Project.start_date,
    "posted_at": Project.posted_at,
    "scraped_at": Project.scraped_at,
    "match_score": Project.match_score,
    "confirmed_score": Project.confirmed_score,
    "endcustomer": Project.endcustomer,
    "hourly_rate": Project.hourly_rate,
}
_DEFAULT_SORT = "posted_at"


def _slave_count_subquery() -> Any:
    """Builds a correlated scalar subquery counting a master's slave projects.

    Returns:
        A labelled scalar subquery for the ``slave_count`` computed column.
    """
    slave_alias = aliased(Project)
    return (
        select(func.count(slave_alias.id))
        .where(slave_alias.canonical_id == Project.id)
        .correlate(Project)
        .scalar_subquery()
        .label("slave_count")
    )


def _search_term_name_subquery() -> Any:
    """Builds a correlated scalar subquery resolving the project's provenance
    SearchTerm name via the raw ProjectFreelancerMap (matched by url).

    The SearchTerm label itself is resolved by its owner
    (``search_term_repository``) so the Project repository never imports the
    foreign SearchTerm model.

    Returns:
        A labelled scalar subquery for the ``search_term_name`` computed column.
    """
    search_term_name = search_term_repository.name_by_id_subquery(ProjectFreelancerMap.search_term_id)
    return (
        select(search_term_name)
        .select_from(ProjectFreelancerMap)
        .where(ProjectFreelancerMap.url == Project.url)
        .correlate(Project)
        .limit(1)
        .scalar_subquery()
        .label("search_term_name")
    )


def _build_order_by(sort_by: str, sort_order: str) -> list[Any]:
    """Builds the effective ORDER BY clause with ``id`` as final tiebreaker.

    The ``id`` tiebreaker (same direction as the primary sort) guarantees a
    total order, so pagination stays stable and neighbour lookups are
    deterministic when the primary sort value ties. Computed sorts
    ``slave_count``/``search_term`` reuse the same correlated subqueries as the
    list query.

    Args:
        sort_by: Column name or computed key (``slave_count``/``search_term``).
        sort_order: Sort direction – ``asc`` or ``desc``.

    Returns:
        Ordered list of SQLAlchemy order-by expressions [primary, id_tiebreaker].
    """
    descending = sort_order == "desc"
    if sort_by == "slave_count":
        column: Any = _slave_count_subquery()
    elif sort_by == "search_term":
        column = _search_term_name_subquery()
    elif sort_by == "job_role_name":
        column = job_role_repository.name_by_id_subquery(Project.job_role_id)
    else:
        column = _SORTABLE_COLUMNS.get(sort_by, Project.posted_at)
    primary = desc(column) if descending else asc(column)
    id_tiebreaker = desc(Project.id) if descending else asc(Project.id)
    return [primary, id_tiebreaker]

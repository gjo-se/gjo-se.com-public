"""Database access for ProjectFreelancerMap (AIScope domain)."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from functools import partial
from typing import Any

from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.schemas.project_freelancer_map_schemas import ProjectFreelancerMapOut
from app.shared.db_access import repository_helpers

_SORTABLE_COLUMNS: dict[str, Any] = {
    "title": ProjectFreelancerMap.title,
    "agency": ProjectFreelancerMap.agency,
    "city": ProjectFreelancerMap.city,
    "remote_percent": ProjectFreelancerMap.remote_percent,
    "contract_type": ProjectFreelancerMap.contract_type,
    "duration": ProjectFreelancerMap.duration,
    "start_date": ProjectFreelancerMap.start_date,
    "posted_at": ProjectFreelancerMap.posted_at,
    "mapped_at": ProjectFreelancerMap.mapped_at,
    "scraped_at": ProjectFreelancerMap.scraped_at,
}
_DEFAULT_SORT = "posted_at"


@dataclass(frozen=True)
class ProjectFreelancerMapFilter:
    """Filter parameters shared by ``get_all`` / ``count``."""

    q: str | None = None
    search_term_id: int | None = None


_to_out = partial(repository_helpers.to_out, dto_cls=ProjectFreelancerMapOut)


def _apply_filters(
    stmt: Select[Any],
    filters: ProjectFreelancerMapFilter,
) -> Select[Any]:
    """Apply search-text and SearchTerm filters to *stmt*.

    Args:
        stmt: SQLAlchemy Select statement.
        filters: Filter parameters (search text, SearchTerm FK).

    Returns:
        Filtered statement.
    """
    if filters.q:
        pattern = f"%{filters.q}%"
        stmt = stmt.where(
            or_(
                ProjectFreelancerMap.title.ilike(pattern),
                ProjectFreelancerMap.description.ilike(pattern),
            )
        )
    if filters.search_term_id is not None:
        stmt = stmt.where(ProjectFreelancerMap.search_term_id == filters.search_term_id)
    return stmt


async def get_cutoff(db: AsyncSession, search_term_id: int) -> datetime | None:
    """Returns MAX(posted_at) for a given SearchTerm.

    Used as cutoff for the delta run of this SearchTerm.
    None if no projects for this term exist in the DB yet (first run).

    Args:
        db: Active gjo_se_com database connection.
        search_term_id: Primary key of the SearchTerm.

    Returns:
        Maximum posted_at date for this SearchTerm or None.
    """
    result = await db.execute(
        select(func.max(ProjectFreelancerMap.posted_at)).where(ProjectFreelancerMap.search_term_id == search_term_id)
    )
    return result.scalar_one_or_none()


async def count_by_search_term_ids(db: AsyncSession, search_term_ids: Sequence[int]) -> dict[int, int]:
    """Return ``search_term_id -> raw-project count`` for the given terms.

    Owner-side read: the ProjectFreelancerMap aggregate owns
    ``ProjectFreelancerMap.search_term_id``, so the SearchTerm list asks the map
    owner for reference counts instead of reaching into the foreign aggregate.
    Terms without raw rows are simply absent from the mapping.

    Args:
        db: Active gjo_se_com database connection.
        search_term_ids: Search term ids to count raw-project rows for.

    Returns:
        Mapping of search-term id to number of referencing raw projects.
    """
    if not search_term_ids:
        return {}
    result = await db.execute(
        select(ProjectFreelancerMap.search_term_id, func.count())
        .where(ProjectFreelancerMap.search_term_id.in_(search_term_ids))
        .group_by(ProjectFreelancerMap.search_term_id)
    )
    return {row[0]: row[1] for row in result.all()}


async def get_by_url(db: AsyncSession, url: str) -> ProjectFreelancerMapOut | None:
    """Returns a project by URL as DTO.

    Args:
        db: Active gjo_se_com database connection.
        url: Full project URL.

    Returns:
        ProjectFreelancerMap DTO or None if not found.
    """
    result = await db.execute(select(ProjectFreelancerMap).where(ProjectFreelancerMap.url == url))
    row = result.scalar_one_or_none()
    return _to_out(row) if row is not None else None


async def get_by_id(db: AsyncSession, project_id: int) -> ProjectFreelancerMapOut | None:
    """Returns a project by ID as DTO.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.

    Returns:
        ProjectFreelancerMap DTO or None if not found.
    """
    result = await db.execute(select(ProjectFreelancerMap).where(ProjectFreelancerMap.id == project_id))
    row = result.scalar_one_or_none()
    return _to_out(row) if row is not None else None


async def set_mapped_at(db: AsyncSession, project_id: int, mapped_at: datetime | None) -> None:
    """Set (or clear) the ``mapped_at`` timestamp of an entry.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key of the raw entry.
        mapped_at: Timestamp to persist, or None to reset for reprocessing.
    """
    project = await db.get(ProjectFreelancerMap, project_id)
    if project is None:
        return
    project.mapped_at = mapped_at
    await db.flush()


async def count(db: AsyncSession, filters: ProjectFreelancerMapFilter) -> int:
    """Returns the number of projects (with optional filter).

    Applies the same filters as ``get_all`` – suitable for pagination metadata.

    Args:
        db: Active gjo_se_com database connection.
        filters: Filter parameters (search text, SearchTerm FK).

    Returns:
        Number of matching entries.
    """
    stmt = select(func.count()).select_from(ProjectFreelancerMap)
    stmt = _apply_filters(stmt, filters)
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_all(
    db: AsyncSession,
    filters: ProjectFreelancerMapFilter,
    *,
    offset: int = 0,
    limit: int = 50,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "desc",
) -> list[ProjectFreelancerMapOut]:
    """Returns paginated projects as DTOs.

    Supports optional full-text search and search-term filter.

    Args:
        db: Active gjo_se_com database connection.
        filters: Filter parameters (search text, SearchTerm FK).
        offset: Number of entries to skip.
        limit: Maximum number of entries.
        sort_by: Column name for sorting (whitelist, default=posted_at).
        sort_order: Sort direction – ``asc`` or ``desc`` (default=desc).

    Returns:
        List of ProjectFreelancerMap DTOs sorted by
        ``sort_by``/``sort_order``.
    """
    column = _SORTABLE_COLUMNS.get(sort_by, ProjectFreelancerMap.posted_at)
    order_expr = desc(column) if sort_order == "desc" else asc(column)
    stmt = select(ProjectFreelancerMap).order_by(order_expr)
    stmt = _apply_filters(stmt, filters)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return [_to_out(row) for row in result.scalars().all()]


async def create(
    db: AsyncSession,
    external_id: str,
    url: str,
    title: str,
    posted_at: datetime,
    scraped_at: datetime,
    description: str | None = None,
    agency: str | None = None,
    contact_name: str | None = None,
    city: str | None = None,
    country: str | None = None,
    remote_percent: int | None = None,
    contract_type: str | None = None,
    duration: int | None = None,
    start_date: str | None = None,
    skills: str | None = None,
    industry: str | None = None,
    extension_possible: bool | None = None,
    endcustomer: bool | None = None,
    search_term_id: int | None = None,
) -> ProjectFreelancerMapOut:
    """Creates a new ProjectFreelancerMap entry.

    Args:
        db: Active gjo_se_com database connection.
        external_id: Portal-specific project ID.
        url: Full project URL.
        title: Project title.
        posted_at: Date posted on the portal.
        scraped_at: Timestamp of the scraping run.
        description: Project description as Markdown.
        agency: Client/agency.
        contact_name: Contact person.
        city: Location city.
        country: Location country.
        remote_percent: Remote percentage.
        contract_type: Contract type.
        duration: Project duration in months.
        start_date: Start date as text.
        skills: JSON array of skill names as string.
        industry: Industry label (in German from source data).
        extension_possible: Extension option.
        endcustomer: Direct assignment from end customer.
        search_term_id: FK to the SearchTerm through which the project was found.

    Returns:
        Newly created ProjectFreelancerMap entry.
    """
    project = ProjectFreelancerMap(
        external_id=external_id,
        url=url,
        title=title,
        description=description,
        agency=agency,
        contact_name=contact_name,
        city=city,
        country=country,
        remote_percent=remote_percent,
        contract_type=contract_type,
        duration=duration,
        start_date=start_date,
        skills=skills,
        industry=industry,
        extension_possible=extension_possible,
        endcustomer=endcustomer,
        search_term_id=search_term_id,
        posted_at=posted_at,
        scraped_at=scraped_at,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return _to_out(project)


async def delete(db: AsyncSession, project_id: int) -> bool:
    """Permanently deletes a ProjectFreelancerMap entry by id.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key of the entry to delete.

    Returns:
        True when the row was deleted; False when no row with the id exists.
    """
    project = await db.get(ProjectFreelancerMap, project_id)
    if project is None:
        return False
    await db.delete(project)
    await db.commit()
    return True

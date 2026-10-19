"""Aiscope admin endpoints: normalised project list, detail and curation.

Covers the ``/projects*`` resource: paginated list, count, create, slaves,
master/slave candidates, detail, list neighbours, status and delete.
"""

import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.repositories.project_repository import ProjectFilter
from app.fbf.schemas.aiscope_router_schemas import (
    ProjectStatusUpdate,
)
from app.fbf.schemas.dedup_schemas import (
    SiblingsResponse,
)
from app.fbf.schemas.project_schemas import (
    ProjectCreate,
    ProjectOut,
)
from app.fbf.services import (
    project_freelancer_map_service,
    project_service,
)
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


def project_filter(
    q: str | None = Query(default=None, description="Full-text search on title + description"),
    search_term_id: int | None = Query(default=None, description="Filter by SearchTerm (provenance)"),
    from_date: datetime.date | None = Query(
        default=None,
        alias="from",
        description="Lower date bound for posted_at (YYYY-MM-DD, inclusive)",
    ),
    to_date: datetime.date | None = Query(
        default=None,
        alias="to",
        description="Upper date bound for posted_at (YYYY-MM-DD, inclusive)",
    ),
    masters_only: bool = Query(
        default=True,
        description="If True (default), only master projects (canonical_id IS NULL).",
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Exact status filter (new/favorite/applied/archived).",
    ),
    include_archived: bool = Query(
        default=False,
        description="If no status is given and True, include archived projects.",
    ),
    min_score: float | None = Query(
        default=None,
        ge=0,
        le=100,
        description="Lower bound for match_score (inclusive). Excludes rows without a score.",
    ),
    merged: bool | None = Query(
        default=None,
        description="If True, only merged projects; if False, only NOT merged.",
    ),
    has_skills: bool | None = Query(
        default=None,
        description="If True, only projects with linked skills; if False, only without.",
    ),
    endcustomer: bool | None = Query(
        default=None,
        description="If True, only Endkunden-Projekte; if False, nur Vermittler.",
    ),
) -> ProjectFilter:
    """Builds the shared project filter from the query parameters.

    Shared by the project list, count and siblings endpoints so the filter query
    parameters are declared exactly once (sort/pagination stay per endpoint).
    """
    return ProjectFilter(
        q=q,
        search_term_id=search_term_id,
        from_date=from_date,
        to_date=to_date,
        masters_only=masters_only,
        status=status_filter,
        include_archived=include_archived,
        min_score=min_score,
        merged=merged,
        has_skills=has_skills,
        endcustomer=endcustomer,
    )


@router.get(
    "/projects",
    response_model=list[ProjectOut],
    summary="Normalisierte Projekte abrufen (Admin)",
)
async def list_projects(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    filters: ProjectFilter = Depends(project_filter),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=5000),
    sort_by: str = Query(
        default="posted_at",
        description=(
            "Sort field (title, city, remote_percent, contract_type, duration, start_date, posted_at, scraped_at)"
        ),
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort direction: asc or desc",
    ),
) -> list[ProjectOut]:
    """Returns paginated normalised projects.

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        filters: Filter parameters (search, provenance, dates, status, score,
            merged, skills, endcustomer).
        offset: Page offset.
        limit: Maximum result count (max. 5000).
        sort_by: Column name for sorting.
        sort_order: Sort direction (asc/desc).

    Returns:
        List of ProjectOut entries sorted by ``sort_by``/``sort_order``.
    """
    return await project_service.list_all(
        db,
        filters,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/projects/count",
    summary="Anzahl der normalisierten Projekte (Admin)",
)
async def count_projects(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    filters: ProjectFilter = Depends(project_filter),
) -> dict[str, int]:
    """Returns the total number of normalised projects.

    Must be defined before ``/projects/{project_id}`` so FastAPI
    does not interpret the string ``count`` as an integer path parameter.

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        filters: Filter parameters (search, provenance, dates, status, score,
            merged, skills, endcustomer).

    Returns:
        ``{"total": <int>}``
    """
    total = await project_service.count(db, filters)
    return {"total": total}


@router.post(
    "/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
    summary="Neues Projekt anlegen (Admin)",
)
async def create_project(
    body: ProjectCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Creates a new master project.

    Guards the globally unique ``url`` (409 on duplicate) and assigns the
    default status ``new`` via ``core_statusable``.

    Args:
        body: Project input (url and title required).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        The created ProjectOut.

    Raises:
        HTTPException 409: A project with the same url already exists.
    """
    return await project_service.create(db, body)


@router.get(
    "/projects/{project_id}/slaves",
    response_model=list[ProjectOut],
    summary="Slave-Projekte eines Masters abrufen (Admin)",
)
async def list_slaves(
    project_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ProjectOut]:
    """Returns all slave projects for a given master project (canonical_id = project_id).

    Args:
        project_id: Primary key of the master project.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        List of slave ProjectOut entries.
    """
    return await project_service.list_slaves(db, project_id)


@router.get(
    "/projects/master-candidates",
    response_model=list[ProjectOut],
    summary="Master-Projekte abrufen, die als neuer Master gewaehlt werden koennen (Admin)",
)
async def list_master_candidates(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search in title or id prefix"),
    exclude_id: int = Query(..., description="Slave project ID to exclude"),
    exclude_current_master_id: int = Query(..., description="Current master ID to exclude"),
) -> list[ProjectOut]:
    """Returns Master projects eligible as a new master.

    Only projects with ``canonical_id IS NULL``. Excludes the slave
    itself and its current master.

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        q: Search term (part of id or title).
        exclude_id: Slave project ID.
        exclude_current_master_id: Current master project ID.

    Returns:
        List of ProjectOut entries (max 7).
    """
    return await project_freelancer_map_service.find_master_candidates(
        db,
        q=q,
        exclude_id=exclude_id,
        exclude_current_master_id=exclude_current_master_id,
    )


@router.get(
    "/projects/slave-candidates",
    response_model=list[ProjectOut],
    summary="Projekte abrufen, die als Slave verknuepfbar sind (Admin)",
)
async def list_slave_candidates(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search in title or id prefix"),
    exclude_canonical_id: int = Query(..., description="Master project ID to exclude from candidates"),
) -> list[ProjectOut]:
    """Returns projects eligible to be linked as slaves.

    Excludes: the master itself, existing slaves of this master,
    and projects that already have children.

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        q: Search term (part of id or title).
        exclude_canonical_id: Current master project ID.

    Returns:
        List of ProjectOut entries (max 7).
    """
    rows = await project_freelancer_map_service.find_slave_candidates(
        db,
        q=q,
        exclude_canonical_id=exclude_canonical_id,
    )
    return [project_service.row_to_project_out(row) for row in rows]


@router.get(
    "/projects/{project_id}",
    response_model=ProjectOut,
    summary="Normalisiertes Projekt-Detail abrufen (Admin)",
)
async def get_project(
    project_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Returns all fields of a normalised project.

    Args:
        project_id: Primary key.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_service.get_by_id(db, project_id)


@router.get(
    "/projects/{project_id}/siblings",
    response_model=SiblingsResponse,
    summary="Vorgaenger/Nachfolger eines Projekts in der Listenansicht (Admin)",
)
async def get_project_siblings(
    project_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    filters: ProjectFilter = Depends(project_filter),
    sort_by: str = Query(
        default="posted_at",
        description=(
            "Sort field (title, city, remote_percent, contract_type, duration, start_date, posted_at, scraped_at)"
        ),
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort direction: asc or desc",
    ),
) -> SiblingsResponse:
    """Returns the prev/next project ids for the same filtered, sorted list view.

    Uses the exact same query parameters and effective ORDER BY as
    ``list_projects`` so navigation follows the current list order across page
    boundaries. Ids are ``null`` at the boundaries of the result set.

    Args:
        project_id: Anchor project whose neighbours are requested.
        _: Admin user (via dependency).
        db: Database connection.
        filters: Filter parameters (must match the list view).
        sort_by: Column name for sorting.
        sort_order: Sort direction (asc/desc).

    Returns:
        SiblingsResponse with prev_id/next_id.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_service.get_neighbors(
        db,
        project_id,
        filters,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.patch(
    "/projects/{project_id}/status",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Projekt-Status setzen (Admin)",
)
async def set_project_status_endpoint(
    project_id: int,
    body: ProjectStatusUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Sets the exclusive status of a project.

    Args:
        project_id: Primary key.
        body: Request body with the new status.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_service.set_status(db, project_id, body.status)


@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Normalisiertes Projekt loeschen (Admin)",
)
async def delete_project(
    project_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Permanently deletes a normalised project.

    Args:
        project_id: Primary key.
        _: Admin user (via dependency).
        db: Database connection.

    Raises:
        HTTPException 404: Project not found.
    """
    await project_service.delete(db, project_id)


@router.post(
    "/projects/{project_id}/recalculate-score",
    status_code=status.HTTP_200_OK,
    summary="Project-Match-Score neu berechnen (Admin)",
)
async def recalculate_project_score(
    project_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, Any]:
    """Recomputes ``match_score`` and ``confirmed_score`` for a single project."""
    return await project_service.recalculate_match_score(db, project_id)


@router.post(
    "/projects/recalculate-scores",
    status_code=status.HTTP_200_OK,
    summary="Alle Project-Match-Scores neu berechnen (Admin)",
)
async def recalculate_all_project_scores(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, Any]:
    """Recomputes ``match_score`` for every project in the database.

    Uses the current formula (3-source equal-weight importance + level‑0
    penalty). No LLM call is made — this is a pure database operation.
    """
    return await project_service.recalculate_all_scores(db)

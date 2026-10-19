"""Aiscope admin endpoints: raw Freelancermap data and mapping overrides.

Covers the ``ProjectFreelancerMap`` resource:

* ``/raw/freelancermap*``              – raw project list, count, detail, delete, reset
* ``/project-freelancer-map/{id}/*``   – unlink, switch-canonical, set-canonical, cousins
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.repositories.project_freelancer_map_repository import ProjectFreelancerMapFilter
from app.fbf.schemas.dedup_schemas import (
    CousinsResponse,
    SetCanonicalRequest,
    SetCanonicalResponse,
    SwitchCanonicalResponse,
    UnlinkResponse,
)
from app.fbf.schemas.project_freelancer_map_schemas import (
    ProjectFreelancerMapOut,
)
from app.fbf.services import (
    project_freelancer_map_service,
)
from app.shared.db_access.session import get_gjo_se_db
from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


def freelancermap_filter(
    q: str | None = Query(default=None, description="Full-text search on title + description"),
    search_term_id: int | None = Query(default=None, description="Filter by SearchTerm ID"),
) -> ProjectFreelancerMapFilter:
    """Builds the shared Freelancermap filter from the query parameters.

    Shared by the list and count endpoints so the two filter query parameters
    (``q``, ``search_term_id``) are declared exactly once.
    """
    return ProjectFreelancerMapFilter(q=q, search_term_id=search_term_id)


@router.get(
    "/raw/freelancermap",
    response_model=list[ProjectFreelancerMapOut],
    summary="Freelancermap-Rohdaten abrufen (Admin)",
)
async def list_freelancermap_projects(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    filters: ProjectFreelancerMapFilter = Depends(freelancermap_filter),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    sort_by: str = Query(
        default="posted_at",
        description=(
            "Sort field (title, agency, city, remote_percent, contract_type, posted_at, mapped_at, scraped_at)"
        ),
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort direction: asc or desc",
    ),
) -> list[ProjectFreelancerMapOut]:
    """Returns paginated Freelancermap projects.

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        filters: Filter parameters (search text, SearchTerm provenance).
        offset: Page offset.
        limit: Maximum result count (max. 200).
        sort_by: Column name for sorting.
        sort_order: Sort direction (asc/desc).

    Returns:
        List of ProjectFreelancerMapOut entries sorted by
        ``sort_by``/``sort_order``.
    """
    return await project_freelancer_map_service.list_all(
        db,
        filters,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/raw/freelancermap/count",
    summary="Anzahl der Freelancermap-Projekte (Admin)",
)
async def count_freelancermap_projects(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    filters: ProjectFreelancerMapFilter = Depends(freelancermap_filter),
) -> dict[str, int]:
    """Returns the total number of Freelancermap projects (with optional filter).

    Must be defined before ``/raw/freelancermap/{freelancermap_id}`` so FastAPI
    does not interpret the string ``count`` as an integer path parameter.

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        filters: Filter parameters (search text, SearchTerm provenance).

    Returns:
        ``{"total": <int>}``
    """
    total = await project_freelancer_map_service.count(db, filters)
    return {"total": total}


@router.get(
    "/raw/freelancermap/{freelancermap_id}",
    response_model=ProjectFreelancerMapOut,
    summary="Freelancermap-Rohdaten-Detail abrufen (Admin)",
)
async def get_freelancermap_project(
    freelancermap_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectFreelancerMapOut:
    """Returns all fields of a project.

    Args:
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        ProjectFreelancerMapOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_freelancer_map_service.get_by_id(db, freelancermap_id)


@router.delete(
    "/raw/freelancermap/{freelancermap_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Freelancermap-Projekt loeschen (Admin)",
)
async def delete_freelancermap_project(
    freelancermap_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Permanently deletes a project.

    Args:
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        _: Admin user (via dependency).
        db: Database connection.

    Raises:
        HTTPException 404: Project not found.
    """
    await project_freelancer_map_service.delete(db, freelancermap_id)


@router.post(
    "/raw/freelancermap/{freelancermap_id}/reset-mapped",
    status_code=status.HTTP_200_OK,
    summary="Reset mapped_at for a single Freelancermap entry (Admin)",
)
async def reset_mapped_at(
    freelancermap_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, object]:
    """Sets ``mapped_at`` of a single entry to NULL.

    The next mapper run will reprocess this entry.

    Args:
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        ID and new mapped_at value (null).

    Raises:
        HTTPException 404: Project not found.
    """
    exists = await db.execute(select(ProjectFreelancerMap.id).where(ProjectFreelancerMap.id == freelancermap_id))
    if exists.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    _upd = await db.execute(
        update(ProjectFreelancerMap).where(ProjectFreelancerMap.id == freelancermap_id).values(mapped_at=None)
    )
    await db.commit()
    return {"id": freelancermap_id, "mapped_at": None}


# ── Override-Endpunkte (Admin) ───────────────────────────────────────────────


@router.post(
    "/project-freelancer-map/{freelancermap_id}/unlink",
    response_model=UnlinkResponse,
    status_code=status.HTTP_200_OK,
    summary="Freelancermap-Eintrag aus kanonischem Project loesen (Admin)",
)
async def unlink_freelancermap(
    freelancermap_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> UnlinkResponse:
    """Detaches a Freelancermap entry from its canonical Project.

    The Freelancermap entry will be reprocessed on the next mapper run as a
    standalone Project.

    Args:
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        UnlinkResponse with status and freelancermap_id.

    Raises:
        HTTPException 404: Freelancermap entry not found.
        HTTPException 400: Freelancermap entry is already unlinked.
    """
    return await project_freelancer_map_service.unlink(db, freelancermap_id)


@router.post(
    "/project-freelancer-map/{freelancermap_id}/switch-canonical",
    response_model=SwitchCanonicalResponse,
    status_code=status.HTTP_200_OK,
    summary="Freelancermap-Eintrag zum neuen kanonischen Project machen (Admin)",
)
async def switch_canonical_freelancermap(
    freelancermap_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SwitchCanonicalResponse:
    """Promotes a Freelancermap entry to become the new canonical Project.

    Creates a new Project from the PM's data, reassigns all linked PMs
    and JobRoles, and deletes the old canonical Project.

    Args:
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        SwitchCanonicalResponse with old and new project IDs.

    Raises:
        HTTPException 404: Freelancermap entry or old canonical Project not found.
        HTTPException 400: Freelancermap entry has no canonical project set.
    """
    return await project_freelancer_map_service.switch_canonical(db, freelancermap_id)


@router.post(
    "/project-freelancer-map/{freelancermap_id}/set-canonical",
    response_model=SetCanonicalResponse,
    status_code=status.HTTP_200_OK,
    summary="Freelancermap-Eintrag manuell einem kanonischen Project zuweisen oder loesen (Admin)",
)
async def set_canonical_freelancermap(
    freelancermap_id: int,
    body: SetCanonicalRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SetCanonicalResponse:
    """Manually links a Freelancermap entry to a canonical Project or unlinks it.

    Sets ``mapped_at = now()`` so the mapper permanently skips this entry.

    Args:
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        body: Request body with ``canonical_project_id`` (int to link, null to unlink).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        SetCanonicalResponse with status, freelancermap_id, and new canonical_project_id.

    Raises:
        HTTPException 404: Freelancermap entry not found.
        HTTPException 404: Target canonical Project not found.
    """
    return await project_freelancer_map_service.set_canonical(db, freelancermap_id, body.canonical_project_id)


@router.post(
    "/project-freelancer-map/{freelancermap_id}/cousins",
    response_model=CousinsResponse,
    status_code=status.HTTP_200_OK,
    summary="Top-10 semantisch aehnliche kanonische Projekte abrufen (Admin)",
)
async def get_cousins_freelancermap(
    freelancermap_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    embedding_client: EmbeddingClient = Depends(get_embedding_client),
) -> CousinsResponse:
    """Returns the top-10 semantically similar canonical Projects for a Freelancermap entry.

    Searches the LanceDB ``project_embeddings`` table via cosine similarity
    and excludes the PM's current canonical Project from results.

    Args:
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        CousinsResponse with freelancermap_id and list of CousinProjectOut entries.

    Raises:
        HTTPException 404: Freelancermap entry not found.
    """
    return await project_freelancer_map_service.get_cousins(db, freelancermap_id, embedding_client=embedding_client)

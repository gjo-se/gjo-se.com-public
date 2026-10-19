"""Aiscope admin endpoints: single-field project updates."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.aiscope_router_schemas import (
    ProjectHourlyRateUpdate,
    ProjectMyHourlyRateUpdate,
    ProjectMyStartDateUpdate,
    ProjectNotesUpdate,
    ProjectTitleNormalizedUpdate,
)
from app.fbf.schemas.project_schemas import ProjectOut
from app.fbf.services import project_field_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.patch(
    "/projects/{project_id}/title-normalized",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Kuratierten Projekttitel setzen (Admin)",
)
async def set_project_title_normalized_endpoint(
    project_id: int,
    body: ProjectTitleNormalizedUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Sets ``project.title_normalized`` – the role source for the application mail.

    Args:
        project_id: Primary key.
        body: Request body with the curated title (or None to clear).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_field_service.set_title_normalized(db, project_id, body.title_normalized)


@router.patch(
    "/projects/{project_id}/notes",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Projekt-Bemerkungen setzen (Admin)",
)
async def set_project_notes_endpoint(
    project_id: int,
    body: ProjectNotesUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Sets ``project.notes`` – the free-text remarks (Markdown source).

    The raw Markdown is stored verbatim and returned unchanged (no server-side
    parsing or escaping); an empty/``None`` value clears the remarks.

    Args:
        project_id: Primary key.
        body: Request body with the free-text notes (or None to clear).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_field_service.set_notes(db, project_id, body.notes)


@router.patch(
    "/projects/{project_id}/hourly-rate",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Geschaetzten Stundensatz setzen (Admin)",
)
async def set_project_hourly_rate_endpoint(
    project_id: int,
    body: ProjectHourlyRateUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Sets ``project.hourly_rate`` – the estimated offer hourly rate (EUR/h).

    Args:
        project_id: Primary key.
        body: Request body with the estimated hourly rate (or None to clear).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_field_service.set_hourly_rate(db, project_id, body.hourly_rate)


@router.patch(
    "/projects/{project_id}/my-hourly-rate",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Eigenen Stundensatz setzen (Admin)",
)
async def set_project_my_hourly_rate_endpoint(
    project_id: int,
    body: ProjectMyHourlyRateUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Sets ``project.my_hourly_rate`` – the own (manual) hourly rate (EUR/h).

    Args:
        project_id: Primary key.
        body: Request body with the own hourly rate (or None to clear).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_field_service.set_my_hourly_rate(db, project_id, body.my_hourly_rate)


@router.patch(
    "/projects/{project_id}/my-start-date",
    response_model=ProjectOut,
    status_code=status.HTTP_200_OK,
    summary="Manuellen Start setzen (Admin)",
)
async def set_project_my_start_date_endpoint(
    project_id: int,
    body: ProjectMyStartDateUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectOut:
    """Sets ``project.my_start_date`` – the manual start override.

    The override wins over the posting text and the scraped ``start_date`` in the
    shared start resolver (CV + score). An ignore token suppresses both.

    Args:
        project_id: Primary key.
        body: Request body with the manual start (or None to clear).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    return await project_field_service.set_my_start_date(db, project_id, body.my_start_date)

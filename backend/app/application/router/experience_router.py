"""FastAPI router for admin application experience endpoints (gjo_se_com).

CRUD + reorder for the structured project list (CV ``Experience`` block,
admin overlay). Status cycling via core_statusable (StatusCell in frontend).
Mirrors the ``career_entry_router`` contract.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationExperienceNotFoundError
from app.application.router.profile_scope_router import require_profile_id
from app.application.schemas.experience_schemas import (
    ExperienceCreate,
    ExperienceOut,
    ExperienceUpdate,
)
from app.application.services import experience_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.status.services import status_service

router = APIRouter()


class ExperienceReorderRequest(BaseModel):
    """Request body for batch-reordering experience projects."""

    ordered_ids: list[int] = Field(..., min_length=1)


@router.get(
    "",
    response_model=list[ExperienceOut],
    summary="List all experience projects",
)
async def list_entries(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ExperienceOut]:
    """Returns all experience projects for the application profile (admin view)."""
    profile_id = await require_profile_id(db)
    rows = await experience_service.get_entries(db, profile_id)
    return [entry for entry, _status_name, _status_color in rows]


@router.post(
    "",
    response_model=ExperienceOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an experience project",
)
async def create_entry(
    _: AdminUser,
    body: ExperienceCreate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ExperienceOut:
    """Creates a new experience project with auto-assigned sort and children."""
    profile_id = await require_profile_id(db)
    created = await experience_service.create_entry(db, profile_id=profile_id, data=body)
    # Default-Status (inactive) zuweisen, damit Anzeige und DB nie auseinanderlaufen.
    await status_service.assign_default_status(db, "application_experience", created.id)
    await db.commit()
    return await experience_service.get_entry(db, created.id)


@router.put(
    "/{experience_id}",
    response_model=ExperienceOut,
    summary="Update an experience project",
)
async def update_entry(
    _: AdminUser,
    experience_id: int,
    body: ExperienceUpdate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ExperienceOut:
    """Partially updates an existing experience project (levels replaced when set)."""
    try:
        updated = await experience_service.update_entry(db, experience_id, body)
    except ApplicationExperienceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    await db.commit()
    return await experience_service.get_entry(db, updated.id)


@router.delete(
    "/{experience_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an experience project",
)
async def delete_entry(
    _: AdminUser,
    experience_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Deletes an experience project by id (children cascade)."""
    try:
        await experience_service.delete_entry(db, experience_id)
    except ApplicationExperienceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    await db.commit()


@router.patch(
    "/reorder",
    response_model=list[ExperienceOut],
    summary="Reorder experience projects",
)
async def reorder_entries(
    _: AdminUser,
    body: ExperienceReorderRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ExperienceOut]:
    """Updates sort for multiple experience projects based on the ordered id list."""
    profile_id = await require_profile_id(db)
    rows = await experience_service.reorder_entries(db, profile_id, body.ordered_ids)
    await db.commit()
    return [entry for entry, _status_name, _status_color in rows]

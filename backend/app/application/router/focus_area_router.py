"""FastAPI router for admin focus area endpoints (gjo_se_com).

CRUD + reorder for the profile's focus areas (e.g. AI / Architecture /
CleanCode). Localized title/summary follow the translation-table pattern.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import FocusAreaNotFoundError
from app.application.router.profile_scope_router import require_profile_id
from app.application.schemas.focus_area_schemas import (
    FocusAreaCreate,
    FocusAreaOut,
    FocusAreaUpdate,
)
from app.application.services import focus_area_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


class FocusAreaReorderRequest(BaseModel):
    """Request body for batch-reordering focus areas."""

    ordered_ids: list[int] = Field(..., min_length=1)


@router.get(
    "",
    response_model=list[FocusAreaOut],
    summary="List all focus areas",
)
async def list_areas(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[FocusAreaOut]:
    """Returns all focus areas for the application profile (admin view)."""
    profile_id = await require_profile_id(db)
    return await focus_area_service.get_areas(db, profile_id)


@router.post(
    "",
    response_model=FocusAreaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a focus area",
)
async def create_area(
    _: AdminUser,
    body: FocusAreaCreate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> FocusAreaOut:
    """Creates a new focus area with auto-assigned sort and translations."""
    profile_id = await require_profile_id(db)
    created = await focus_area_service.create_area(db, profile_id=profile_id, data=body)
    await db.commit()
    return await focus_area_service.get_area(db, created.id)


@router.put(
    "/{area_id}",
    response_model=FocusAreaOut,
    summary="Update a focus area",
)
async def update_area(
    _: AdminUser,
    area_id: int,
    body: FocusAreaUpdate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> FocusAreaOut:
    """Partially updates an existing focus area (translations replaced when provided)."""
    try:
        updated = await focus_area_service.update_area(db, area_id, body)
    except FocusAreaNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    await db.commit()
    return await focus_area_service.get_area(db, updated.id)


@router.delete(
    "/{area_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a focus area",
)
async def delete_area(
    _: AdminUser,
    area_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Deletes a focus area by id."""
    try:
        await focus_area_service.delete_area(db, area_id)
    except FocusAreaNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    await db.commit()


@router.patch(
    "/reorder",
    response_model=list[FocusAreaOut],
    summary="Reorder focus areas",
)
async def reorder_areas(
    _: AdminUser,
    body: FocusAreaReorderRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[FocusAreaOut]:
    """Updates sort for multiple focus areas based on the ordered id list."""
    profile_id = await require_profile_id(db)
    areas = await focus_area_service.reorder_areas(db, profile_id, body.ordered_ids)
    await db.commit()
    return areas

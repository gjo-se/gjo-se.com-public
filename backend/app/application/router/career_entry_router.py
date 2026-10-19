"""FastAPI router for admin career entry endpoints (gjo_se_com).

CRUD + reorder for Greg's professional timeline.
Status cycling via core_statusable (StatusCell in frontend).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import CareerEntryNotFoundError
from app.application.router.profile_scope_router import require_profile_id
from app.application.schemas.career_entry_schemas import (
    CareerEntryCreate,
    CareerEntryOut,
    CareerEntryUpdate,
)
from app.application.services import career_entry_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.status.services import status_service

router = APIRouter()


class CareerEntryReorderRequest(BaseModel):
    """Request body for batch-reordering career entries."""

    ordered_ids: list[int] = Field(..., min_length=1)


@router.get(
    "",
    response_model=list[CareerEntryOut],
    summary="List all career entries",
)
async def list_entries(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[CareerEntryOut]:
    """Returns all career entries for the application profile (admin view)."""
    profile_id = await require_profile_id(db)
    rows = await career_entry_service.get_entries(db, profile_id)
    return [entry for entry, _status_name, _status_color in rows]


@router.post(
    "",
    response_model=CareerEntryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a career entry",
)
async def create_entry(
    _: AdminUser,
    body: CareerEntryCreate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CareerEntryOut:
    """Creates a new career entry with auto-assigned sort and translations."""
    profile_id = await require_profile_id(db)
    created = await career_entry_service.create_entry(db, profile_id=profile_id, data=body)
    # Default-Status (inactive) zuweisen, damit Anzeige und DB nie auseinanderlaufen.
    await status_service.assign_default_status(db, "application_career_entry", created.id)
    await db.commit()
    return await career_entry_service.get_entry(db, created.id)


@router.put(
    "/{entry_id}",
    response_model=CareerEntryOut,
    summary="Update a career entry",
)
async def update_entry(
    _: AdminUser,
    entry_id: int,
    body: CareerEntryUpdate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CareerEntryOut:
    """Partially updates an existing career entry (translations replaced when provided)."""
    try:
        updated = await career_entry_service.update_entry(db, entry_id, body)
    except CareerEntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    await db.commit()
    return await career_entry_service.get_entry(db, updated.id)


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a career entry",
)
async def delete_entry(
    _: AdminUser,
    entry_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Deletes a career entry by id."""
    try:
        await career_entry_service.delete_entry(db, entry_id)
    except CareerEntryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    await db.commit()


@router.patch(
    "/reorder",
    response_model=list[CareerEntryOut],
    summary="Reorder career entries",
)
async def reorder_entries(
    _: AdminUser,
    body: CareerEntryReorderRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[CareerEntryOut]:
    """Updates sort for multiple entries based on the ordered id list."""
    profile_id = await require_profile_id(db)
    rows = await career_entry_service.reorder_entries(db, profile_id, body.ordered_ids)
    await db.commit()
    return [entry for entry, _status_name, _status_color in rows]

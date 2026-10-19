"""Admin upsert route for the application profile.

Owns the singleton PUT upsert. Split out of ``profile_router`` so that module
stays cohesive (LCOM4): the write path uses ``profile_service`` as its
collaborator, the read/photo routes use ``profile_repository``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ProfileNotFoundError
from app.application.schemas.profile_schemas import ProfileOut, ProfileUpdate
from app.application.services import profile_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

#: Admin upsert router, mounted under ``/admin/application-profile``.
admin_router = APIRouter()


@admin_router.put(
    "",
    response_model=ProfileOut,
    summary="Create or update the application profile (Upsert)",
)
async def upsert_profile(
    _: AdminUser,
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProfileOut:
    """Upsert for the singleton profile.

    Creates a new profile if none exists, otherwise updates the existing one.
    The ``created_at`` timestamp is preserved on updates (only ``updated_at``
    is touched). ``translations`` are replaced via the translation-table pattern.
    """
    try:
        profile = await profile_service.upsert_profile(db, body)
    except ProfileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e
    await db.commit()
    return profile

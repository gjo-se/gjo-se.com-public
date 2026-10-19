"""Shared profile-scope helper for the application admin routers."""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.repositories import profile_repository


async def require_profile_id(db: AsyncSession) -> int:
    """Resolve the singleton application-profile id or raise 404.

    Args:
        db: Active async database session.

    Returns:
        The singleton application-profile id.

    Raises:
        HTTPException: 404 when no application profile exists yet.
    """
    profile = await profile_repository.get_profile(db)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kein Application Profile gefunden. Bitte zuerst ein Profil anlegen.",
        )
    return profile.id

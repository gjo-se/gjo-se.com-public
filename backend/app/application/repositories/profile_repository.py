"""Database access for the singleton application profile (gjo_se_com).

Reads and writes return ``ProfileOut`` DTOs (never ORM models) so the service
layer stays free of ``app.<ctx>.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from collections.abc import Mapping

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.models.profile import Profile
from app.application.models.profile_translation import ProfileTranslation
from app.application.schemas.profile_schemas import (
    ProfileCreate,
    ProfileLocaleFieldsOut,
    ProfileOut,
    ProfileUpdate,
)


def _to_out(profile: Profile) -> ProfileOut:
    """Maps a profile ORM row (with loaded translations) to its DTO."""
    return ProfileOut(
        id=profile.id,
        full_name=profile.full_name,
        remote=profile.remote,
        languages=profile.languages,
        photo_url=profile.photo_url,
        headline=profile.headline,
        email=profile.email,
        phone=profile.phone,
        location=profile.location,
        github_url=profile.github_url,
        linkedin_url=profile.linkedin_url,
        website_url=profile.website_url,
        hourly_rate=profile.hourly_rate,
        hourly_rate_currency=profile.hourly_rate_currency,
        available_from=profile.available_from,
        translations={t.locale: ProfileLocaleFieldsOut(story=t.story) for t in profile.translations},
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


async def _get_orm(db: AsyncSession) -> Profile | None:
    """Returns the singleton profile ORM row (translations loaded) or None."""
    result = await db.execute(select(Profile).options(selectinload(Profile.translations)).limit(1))
    return result.scalar_one_or_none()


async def get_profile(db: AsyncSession) -> ProfileOut | None:
    """Returns the singleton application profile as DTO or None if not created.

    Focus areas belong to their own aggregate and are loaded through
    ``focus_area_repository``.
    """
    profile = await _get_orm(db)
    return _to_out(profile) if profile is not None else None


async def create_profile(db: AsyncSession, data: ProfileCreate) -> ProfileOut:
    """Builds and persists a new application profile, returning its DTO."""
    profile = Profile(**data.model_dump(exclude={"translations"}))
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    if data.translations:
        await replace_translations(db, profile.id, data.translations)
    created = await get_profile(db)
    if created is None:
        raise RuntimeError("profile vanished after create")
    return created


async def update_profile(db: AsyncSession, data: ProfileUpdate) -> ProfileOut | None:
    """Applies scalar changes (+ optional translation replacement) and returns the DTO."""
    profile = await _get_orm(db)
    if profile is None:
        return None
    for key, value in data.model_dump(exclude_unset=True, exclude={"translations"}).items():
        setattr(profile, key, value)
    await db.flush()
    if data.translations is not None:
        await replace_translations(db, profile.id, data.translations)
    return await get_profile(db)


async def set_photo_url(db: AsyncSession, profile_id: int, key: str) -> None:
    """Stores the object-storage key of the profile photo in ``photo_url``."""
    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()
    if profile is not None:
        profile.photo_url = key
        await db.flush()


async def replace_translations(
    db: AsyncSession,
    profile_id: int,
    translations: Mapping[str, ProfileLocaleFieldsOut],
) -> None:
    """Replaces all translation rows of the profile with *translations*.

    Uses the translation-table pattern: existing rows are removed and the new
    rows created in one flush, avoiding partial merges. The caller owns the
    transaction boundaries.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id whose translations are replaced.
        translations: Mapping of locale → localized fields to persist.
    """
    _ = await db.execute(delete(ProfileTranslation).where(ProfileTranslation.profile_id == profile_id))
    db.add_all(
        ProfileTranslation(
            profile_id=profile_id,
            locale=locale,
            story=fields.story,
        )
        for locale, fields in translations.items()
    )
    await db.flush()

"""FastAPI router for the application profile – public (About page) and admin.

Public read-only aggregate: profile + active career entries + languages +
public skills (``level_public > 0``), no authentication required. The requested
``locale`` (``de``/``en``) selects the localized ``story`` and ``focusAreas``
(fallback ``de``). ``GET /stream/{key}`` streams any stored asset (e.g. the
portrait photo) from the ObjectStore – the SOTA stream pattern shared with the
portfolio stream.

Admin: singleton GET (read) and PUT (upsert) for the application profile with
localized ``translations`` (``{de|en} → {story}``, translation-table pattern),
``POST /photo`` multipart portrait upload (stored key in ``photo_url``) and
``GET /assets`` object-store listing for the file picker.

Both scopes live in this one module (namespace canon, rule 7): the
public routes are exported as ``router``, the admin routes as ``admin_router``
– so the de-prefixed role file name ``profile_router.py`` stays collision-free.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ProfileNotFoundError
from app.application.repositories import focus_area_repository, profile_repository
from app.application.schemas.career_entry_schemas import CareerEntryOut
from app.application.schemas.focus_area_schemas import FocusAreaOut
from app.application.schemas.profile_schemas import ProfileOut
from app.application.schemas.public_profile_schemas import (
    ProfilePublicOut,
    ProfilePublicResponse,
    SkillPublicOut,
)
from app.application.services import career_entry_service, photo_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.skill import SkillCatalogPort, get_skill_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError

logger = logging.getLogger(__name__)

#: Public router (About page), mounted under ``/public/application-profile``.
router = APIRouter()
#: Admin router, mounted under ``/admin/application-profile``.
admin_router = APIRouter()

_LOCALE_PATTERN = "^(de|en)$"


# ── Public endpoints ─────────────────────────────────────────────────────────


def _parse_languages(raw: str | None) -> list[str]:
    """Splits the comma-separated ISO-2 language codes into a clean list.

    Trims whitespace, lowercases, and drops empty/unknown entries so the
    About page receives a stable set of ISO codes (e.g. ``['de', 'en']``).
    """
    if not raw:
        return []
    seen: set[str] = set()
    codes: list[str] = []
    for part in raw.split(","):
        code = part.strip().lower()
        if code and code not in seen:
            seen.add(code)
            codes.append(code)
    return codes


@router.get(
    "",
    response_model=ProfilePublicResponse,
    summary="Get public application profile (About page)",
)
async def get_public_profile(
    locale: str = Query(default="de", pattern=_LOCALE_PATTERN),
    db: AsyncSession = Depends(get_gjo_se_db),
    skills_catalog: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> ProfilePublicResponse:
    """Public read-only endpoint for the About page.

    Aggregates the singleton profile, active career entries,
    languages, and public skills (``level_public > 0``). ``story`` and
    ``focusAreas`` are resolved for the requested locale (fallback: ``de``,
    then ``None``).
    """
    profile = await profile_repository.get_profile(db)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No application profile available.",
        )

    profile_id = profile.id

    # Active career entries (sorted, active only)
    career_entries = await career_entry_service.get_entries(db, profile_id, active_only=True)

    # Public skills (level_public > 0, confirmed only) via the skill-catalog port
    skills = await skills_catalog.list_public_profile_skills(db)

    # Localized story with de-fallback (then None)
    row = profile.translations.get(locale) or profile.translations.get("de")
    story = row.story if row is not None else None

    # Focus areas flattened to the requested locale (de-fallback). Loaded via
    # their own aggregate owner (focus_area_repository), not the profile row.
    areas = await focus_area_repository.get_by_profile(db, profile.id)
    focus_areas: list[FocusAreaOut] = []
    for area in areas:
        area_row = area.translations.get(locale) or area.translations.get("de")
        focus_areas.append(
            area.model_copy(
                update={
                    "title": area_row.title if area_row is not None else None,
                    "summary": area_row.summary if area_row is not None else None,
                    "translations": {},
                }
            )
        )

    profile_out = ProfilePublicOut(
        id=profile.id,
        full_name=profile.full_name,
        location=profile.location,
        remote=profile.remote,
        languages=profile.languages,
        photo_url=profile.photo_url,
        headline=profile.headline,
        github_url=profile.github_url,
        linkedin_url=profile.linkedin_url,
        translations={},
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )

    # Career entries: flat ``description`` selected for the requested locale
    # (fallback ``de``, then ``None``). The translations map stays empty in the
    # public path – only the admin path serializes the full map.
    career_out: list[CareerEntryOut] = []
    for entry, status_name, status_color in career_entries:
        row = entry.translations.get(locale) or entry.translations.get("de")
        description = row.description if row is not None else None
        career_out.append(
            entry.model_copy(
                update={"description": description, "status": status_name, "status_color_token": status_color}
            )
        )

    return ProfilePublicResponse(
        profile=profile_out,
        career=career_out,
        languages=_parse_languages(profile.languages),
        skills=[SkillPublicOut(id=s.id, name=s.name, level_public=s.level_public) for s in skills],
        story=story,
        focus_areas=focus_areas,
    )


# ── Admin endpoints ──────────────────────────────────────────────────────────


@admin_router.get(
    "",
    response_model=ProfileOut,
    summary="Get the application profile",
)
async def get_profile(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProfileOut:
    """Returns the singleton application profile or 404 if not yet created."""
    profile = await profile_repository.get_profile(db)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kein Application Profile gefunden. Bitte zuerst via PUT anlegen.",
        )
    return profile


@admin_router.post(
    "/photo",
    response_model=ProfileOut,
    summary="Upload the profile photo (admin)",
)
async def upload_profile_photo(
    _: AdminUser,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProfileOut:
    """Validates and stores the profile photo, then returns the updated profile.

    Multipart upload (SVG/PNG/JPEG/WebP, max. 5 MB). The file is persisted in
    the object store under ``profile/photo.{ext}`` and the key is stored in
    ``photo_url``. 404 if no profile exists yet, 422 on invalid content type
    or oversized files.
    """
    try:
        # Return value (storage key) is not needed – the response is built
        # from the reloaded profile below.
        _key = await photo_service.upload_profile_photo(db, file)
    except ProfileNotFoundError as exc:
        logger.warning("profile photo upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except InvalidImageTypeError as exc:
        logger.warning("profile photo upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except ImageTooLargeError as exc:
        logger.warning("profile photo upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    # Reload after commit so ``updated_at`` and ``photo_url`` are current.
    profile = await profile_repository.get_profile(db)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kein Application Profile gefunden.",
        )
    return profile

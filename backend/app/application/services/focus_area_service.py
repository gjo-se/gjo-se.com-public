"""Business logic for application focus areas (gjo_se_com).

Manages the profile's focus areas with auto-sorting, localized title/summary
(translation-table pattern) and batch reordering. The service orchestrates over
``FocusAreaOut`` DTOs; every SQLAlchemy/ORM concern lives in
``focus_area_repository`` (Achse 2: ``services`` > ``repositories``).
"""

from app.application.exceptions import FocusAreaNotFoundError
from app.application.repositories import focus_area_repository
from app.application.schemas.focus_area_schemas import (
    FocusAreaCreate,
    FocusAreaOut,
    FocusAreaUpdate,
)
from app.shared.db_access.session_types import AsyncSession


async def get_areas(db: AsyncSession, profile_id: int) -> list[FocusAreaOut]:
    """Returns focus areas for a profile, sorted by sort ASC."""
    return await focus_area_repository.get_by_profile(db, profile_id)


async def get_area(db: AsyncSession, area_id: int) -> FocusAreaOut:
    """Returns a single focus area by id.

    Raises:
        FocusAreaNotFoundError: If no focus area with the given id exists.
    """
    area = await focus_area_repository.get_by_id(db, area_id)
    if area is None:
        raise FocusAreaNotFoundError(f"Fokus-Bereich mit ID {area_id} nicht gefunden")
    return area


async def create_area(db: AsyncSession, *, profile_id: int, data: FocusAreaCreate) -> FocusAreaOut:
    """Persists a new focus area with auto-assigned sort and its translations.

    The new area receives ``sort = max(sort) + 1`` for the owning profile.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id the area belongs to.
        data: Validated create payload (slug, url, sort, translations).

    Returns:
        The created focus area as DTO.
    """
    max_sort = await focus_area_repository.get_max_sort(db, profile_id)
    return await focus_area_repository.create(
        db,
        application_profile_id=profile_id,
        slug=data.slug,
        sort=max_sort + 1,
        url=data.url,
        translations=data.translations,
    )


async def update_area(db: AsyncSession, area_id: int, data: FocusAreaUpdate) -> FocusAreaOut:
    """Persists changes to an existing focus area.

    Only fields set in ``data`` are applied; when ``translations`` is set the
    existing translation rows are replaced (translation-table pattern).

    Args:
        db: Active async DB session.
        area_id: The focus_area id.
        data: Partial update payload.

    Returns:
        The updated focus area as DTO.

    Raises:
        FocusAreaNotFoundError: If no focus area with the given id exists.
    """
    changes = data.model_dump(exclude_unset=True, exclude={"translations"})
    updated = await focus_area_repository.update(db, area_id, changes=changes, translations=data.translations)
    if updated is None:
        raise FocusAreaNotFoundError(f"Fokus-Bereich mit ID {area_id} nicht gefunden")
    return updated


async def delete_area(db: AsyncSession, area_id: int) -> None:
    """Deletes a focus area by id.

    Raises:
        FocusAreaNotFoundError: If no focus area with the given id exists.
    """
    if await focus_area_repository.get_by_id(db, area_id) is None:
        raise FocusAreaNotFoundError(f"Fokus-Bereich mit ID {area_id} nicht gefunden")
    await focus_area_repository.delete(db, area_id)


async def reorder_areas(db: AsyncSession, profile_id: int, ordered_ids: list[int]) -> list[FocusAreaOut]:
    """Updates sort for multiple focus areas atomically.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id.
        ordered_ids: List of focus_area ids in desired order (index 0 = first).

    Returns:
        The re-sorted list of focus areas as DTOs.
    """
    return await focus_area_repository.reorder(db, profile_id, ordered_ids)

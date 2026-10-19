"""Business logic for career entries (gjo_se_com).

Manages Greg's professional timeline entries with auto-sorting, localized
descriptions (translation-table pattern) and batch reordering. The service
orchestrates over ``CareerEntryOut`` DTOs; every SQLAlchemy/ORM concern lives in
``career_entry_repository`` (Achse 2: ``services`` > ``repositories``).
"""

from app.application.exceptions import CareerEntryNotFoundError
from app.application.repositories import career_entry_repository
from app.application.schemas.career_entry_schemas import (
    CareerEntryCreate,
    CareerEntryOut,
    CareerEntryUpdate,
)
from app.shared.db_access.session_types import AsyncSession


async def get_entries(
    db: AsyncSession,
    profile_id: int,
    active_only: bool = False,
) -> list[tuple[CareerEntryOut, str | None, str | None]]:
    """Returns career entries for a profile with core status, sorted by sort ASC."""
    return await career_entry_repository.get_by_profile(db, profile_id, active_only=active_only)


async def get_entry(db: AsyncSession, entry_id: int) -> CareerEntryOut:
    """Returns a single career entry by id.

    Raises:
        CareerEntryNotFoundError: If no entry with the given id exists.
    """
    entry = await career_entry_repository.get_by_id(db, entry_id)
    if entry is None:
        raise CareerEntryNotFoundError(f"Career-Entry mit ID {entry_id} nicht gefunden")
    return entry


async def create_entry(db: AsyncSession, *, profile_id: int, data: CareerEntryCreate) -> CareerEntryOut:
    """Persists a new career entry with auto-assigned sort and its translations.

    The new entry receives ``sort = max(sort) + 1`` for the owning profile.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id the entry belongs to.
        data: Validated create payload.

    Returns:
        The created career entry as DTO.
    """
    max_sort = await career_entry_repository.get_max_sort(db, profile_id)
    return await career_entry_repository.create(
        db,
        application_profile_id=profile_id,
        position=data.position,
        start_date=data.start_date,
        sort=max_sort + 1,
        company=data.company,
        project_url=data.project_url,
        end_date=data.end_date,
        translations=data.translations,
    )


async def update_entry(db: AsyncSession, entry_id: int, data: CareerEntryUpdate) -> CareerEntryOut:
    """Persists changes to an existing career entry.

    Only fields set in ``data`` are applied; when ``translations`` is set the
    existing translation rows are replaced (translation-table pattern).

    Args:
        db: Active async DB session.
        entry_id: The career_entry id.
        data: Partial update payload.

    Returns:
        The updated career entry as DTO.

    Raises:
        CareerEntryNotFoundError: If no entry with the given id exists.
    """
    changes = data.model_dump(exclude_unset=True, exclude={"translations"})
    updated = await career_entry_repository.update(db, entry_id, changes=changes, translations=data.translations)
    if updated is None:
        raise CareerEntryNotFoundError(f"Career-Entry mit ID {entry_id} nicht gefunden")
    return updated


async def delete_entry(db: AsyncSession, entry_id: int) -> None:
    """Deletes a career entry by id.

    Raises:
        CareerEntryNotFoundError: If no entry with the given id exists.
    """
    if await career_entry_repository.get_by_id(db, entry_id) is None:
        raise CareerEntryNotFoundError(f"Career-Entry mit ID {entry_id} nicht gefunden")
    await career_entry_repository.delete(db, entry_id)


async def reorder_entries(
    db: AsyncSession,
    profile_id: int,
    ordered_ids: list[int],
) -> list[tuple[CareerEntryOut, str | None, str | None]]:
    """Updates sort for multiple entries atomically.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id.
        ordered_ids: List of entry ids in desired order (index 0 = first).

    Returns:
        The re-sorted list of career entries.
    """
    return await career_entry_repository.reorder(db, profile_id, ordered_ids)

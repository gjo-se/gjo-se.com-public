"""Business logic for application experience projects (gjo_se_com).

Orchestrates the structured project-list entries: auto-sorting, localized text
blocks (translation-table pattern) plus their ordered child levels (``decisions``
/ ``proofs``) and batch reordering. The service composes DTOs; every
SQLAlchemy/ORM concern lives in ``experience_repository`` (Achse 2: ``services`` >
``repositories``).
"""

from app.application.exceptions import ApplicationExperienceNotFoundError
from app.application.repositories import experience_repository
from app.application.schemas.experience_schemas import (
    ExperienceCreate,
    ExperienceOut,
    ExperienceUpdate,
)
from app.shared.db_access.session_types import AsyncSession


async def get_entries(
    db: AsyncSession,
    profile_id: int,
    active_only: bool = False,
) -> list[tuple[ExperienceOut, str | None, str | None]]:
    """Returns experience projects for a profile with core status, sorted by sort ASC."""
    return await experience_repository.get_by_profile(db, profile_id, active_only=active_only)


async def get_entry(db: AsyncSession, entry_id: int) -> ExperienceOut:
    """Returns a single experience project by id.

    Raises:
        ApplicationExperienceNotFoundError: If no entry with the given id exists.
    """
    entry = await experience_repository.get_by_id(db, entry_id)
    if entry is None:
        raise ApplicationExperienceNotFoundError(f"Experience mit ID {entry_id} nicht gefunden")
    return entry


async def create_entry(db: AsyncSession, *, profile_id: int, data: ExperienceCreate) -> ExperienceOut:
    """Persists a new experience project with auto-assigned sort and its children.

    The new entry receives ``sort = max(sort) + 1`` for the owning profile.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id the entry belongs to.
        data: Validated create payload (structure + translations/decisions/proofs).

    Returns:
        The created experience project as DTO.
    """
    max_sort = await experience_repository.get_max_sort(db, profile_id)
    return await experience_repository.create(
        db,
        application_profile_id=profile_id,
        position=data.position,
        start_date=data.start_date,
        sort=max_sort + 1,
        company=data.company,
        project_url=data.project_url,
        end_date=data.end_date,
        translations=data.translations,
        decisions=data.decisions,
        proofs=data.proofs,
    )


async def update_entry(db: AsyncSession, entry_id: int, data: ExperienceUpdate) -> ExperienceOut:
    """Persists changes to an existing experience project.

    Only the levels set in *data* (not ``None``) are replaced; unset levels stay
    untouched.

    Args:
        db: Active async DB session.
        entry_id: The experience id.
        data: Partial update payload.

    Returns:
        The updated experience project as DTO.

    Raises:
        ApplicationExperienceNotFoundError: If no entry with the given id exists.
    """
    changes = data.model_dump(exclude_unset=True, exclude={"translations", "decisions", "proofs"})
    updated = await experience_repository.update(
        db,
        entry_id,
        changes=changes,
        translations=data.translations,
        decisions=data.decisions,
        proofs=data.proofs,
    )
    if updated is None:
        raise ApplicationExperienceNotFoundError(f"Experience mit ID {entry_id} nicht gefunden")
    return updated


async def delete_entry(db: AsyncSession, entry_id: int) -> None:
    """Deletes an experience project (children cascade).

    Raises:
        ApplicationExperienceNotFoundError: If no entry with the given id exists.
    """
    if await experience_repository.get_by_id(db, entry_id) is None:
        raise ApplicationExperienceNotFoundError(f"Experience mit ID {entry_id} nicht gefunden")
    await experience_repository.delete(db, entry_id)


async def reorder_entries(
    db: AsyncSession,
    profile_id: int,
    ordered_ids: list[int],
) -> list[tuple[ExperienceOut, str | None, str | None]]:
    """Updates sort for multiple experiences atomically.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id.
        ordered_ids: Experience ids in desired order (index 0 = first).

    Returns:
        The re-sorted list of experiences.
    """
    return await experience_repository.reorder(db, profile_id, ordered_ids)

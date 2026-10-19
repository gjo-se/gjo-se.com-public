"""Database access for career entries (gjo_se_com).

Read operations return ``CareerEntryOut`` DTOs (never ORM models) so the service
layer stays free of ``app.<ctx>.models`` imports (Achse 2: ``services`` >
``repositories``). Writes build the ORM row here and return the DTO.
"""

from collections.abc import Mapping
from datetime import date
from typing import Any

from sqlalchemy import Select, asc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.models.career_entry import CareerEntry
from app.application.models.career_entry_translation import CareerEntryTranslation
from app.application.schemas.career_entry_schemas import (
    CareerEntryOut,
    CareerLocaleFieldsOut,
)
from app.shared.db_access import repository_helpers
from app.shared.status.models.status import Status, Statusable


def _to_out(entry: CareerEntry, status_name: str | None, status_color: str | None) -> CareerEntryOut:
    """Maps a career-entry ORM row (with loaded translations) to its DTO."""
    return CareerEntryOut(
        id=entry.id,
        application_profile_id=entry.application_profile_id,
        position=entry.position,
        company=entry.company,
        project_url=entry.project_url,
        start_date=entry.start_date,
        end_date=entry.end_date,
        sort=entry.sort,
        status=status_name,
        status_color_token=status_color,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        translations={t.locale: CareerLocaleFieldsOut(description=t.description) for t in entry.translations},
    )


async def get_by_profile(
    db: AsyncSession,
    profile_id: int,
    active_only: bool = False,
) -> list[tuple[CareerEntryOut, str | None, str | None]]:
    """Returns all career entries for a profile with core status, sorted by sort ASC.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id.
        active_only: If True, only returns entries with status='active' (via core_statusable).

    Returns:
        List of (CareerEntryOut, status_name, status_color_token) tuples.
    """
    stmt: Select[Any] = (
        select(
            CareerEntry,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .options(selectinload(CareerEntry.translations))
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "application_career_entry") & (Statusable.statusable_id == CareerEntry.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .where(CareerEntry.application_profile_id == profile_id)
        .order_by(asc(CareerEntry.sort))
    )
    if active_only:
        stmt = stmt.where(Status.name == "active")
    result = await db.execute(stmt)
    return [(_to_out(row[0], row[1], row[2]), row[1], row[2]) for row in result.all()]


async def get_by_id(db: AsyncSession, entry_id: int) -> CareerEntryOut | None:
    """Returns a single career entry by id as DTO or None."""
    result = await db.execute(
        select(CareerEntry).options(selectinload(CareerEntry.translations)).where(CareerEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    return _to_out(entry, None, None) if entry is not None else None


async def get_max_sort(db: AsyncSession, profile_id: int) -> int:
    """Returns the highest sort value for a profile's entries (0 if none)."""
    return await repository_helpers.get_max_sort(
        db,
        model=CareerEntry,
        scope_attr=CareerEntry.application_profile_id,
        scope_value=profile_id,
    )


async def create(
    db: AsyncSession,
    *,
    application_profile_id: int,
    position: str,
    start_date: date,
    sort: int,
    company: str | None = None,
    project_url: str | None = None,
    end_date: date | None = None,
    translations: Mapping[str, CareerLocaleFieldsOut] | None = None,
) -> CareerEntryOut:
    """Builds and persists a new career entry, returning its DTO."""
    entry = CareerEntry(
        application_profile_id=application_profile_id,
        position=position,
        company=company,
        project_url=project_url,
        start_date=start_date,
        end_date=end_date,
        sort=sort,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    if translations:
        await replace_translations(db, entry.id, translations)
    created = await get_by_id(db, entry.id)
    if created is None:
        raise RuntimeError("career entry vanished after create")
    return created


async def update(
    db: AsyncSession,
    entry_id: int,
    *,
    changes: Mapping[str, object],
    translations: Mapping[str, CareerLocaleFieldsOut] | None = None,
) -> CareerEntryOut | None:
    """Applies scalar changes to an existing career entry and returns its DTO."""
    result = await db.execute(select(CareerEntry).where(CareerEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        return None
    for key, value in changes.items():
        setattr(entry, key, value)
    await db.flush()
    if translations is not None:
        await replace_translations(db, entry.id, translations)
    return await get_by_id(db, entry.id)


async def delete(db: AsyncSession, entry_id: int) -> None:
    """Deletes a career entry by id (translations cascade via relationship)."""
    result = await db.execute(select(CareerEntry).where(CareerEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is not None:
        await db.delete(entry)
        await db.flush()


async def reorder(
    db: AsyncSession,
    profile_id: int,
    ordered_ids: list[int],
) -> list[tuple[CareerEntryOut, str | None, str | None]]:
    """Updates sort for multiple entries based on the ordered id list.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id to scope the update.
        ordered_ids: List of career_entry ids in desired order (index = sort).

    Returns:
        The re-sorted list of career entries.
    """
    await repository_helpers.reorder(
        db,
        model=CareerEntry,
        scope_attr=CareerEntry.application_profile_id,
        scope_value=profile_id,
        ordered_ids=ordered_ids,
    )
    return await get_by_profile(db, profile_id)


async def replace_translations(
    db: AsyncSession,
    entry_id: int,
    translations: Mapping[str, CareerLocaleFieldsOut],
) -> None:
    """Replaces all translation rows of the career entry with *translations*.

    Uses the translation-table pattern: existing rows are deleted and the new
    rows created in one flush, avoiding partial merges.

    Args:
        db: Active async DB session.
        entry_id: The career_entry id whose translations are replaced.
        translations: Mapping of locale → localized fields to persist.
    """
    await repository_helpers.replace_translations(
        db,
        translation_model=CareerEntryTranslation,
        fk_attr="career_entry_id",
        owner_id=entry_id,
        translations=translations,
    )

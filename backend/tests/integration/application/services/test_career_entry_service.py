"""Integration tests for the career-entry service (real Postgres)."""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import CareerEntryNotFoundError
from app.application.models.profile import Profile
from app.application.schemas.career_entry_schemas import (
    CareerEntryCreate,
    CareerEntryUpdate,
    CareerLocaleFieldsOut,
)
from app.application.services import career_entry_service

pytestmark = pytest.mark.integration


def _new_entry(position: str) -> CareerEntryCreate:
    """Build a create payload for the profile."""
    return CareerEntryCreate(position=position, start_date=date(2026, 1, 1))


async def test_create_entry_assigns_incremental_sort(db_session: AsyncSession, app_profile: Profile) -> None:
    """A new entry receives ``max(sort) + 1``."""
    first = await career_entry_service.create_entry(db_session, profile_id=app_profile.id, data=_new_entry("A"))

    second = await career_entry_service.create_entry(db_session, profile_id=app_profile.id, data=_new_entry("B"))

    assert first.sort == 1
    assert second.sort == 2


async def test_get_entry_raises_when_missing(db_session: AsyncSession) -> None:
    """An unknown id raises a domain not-found error."""
    with pytest.raises(CareerEntryNotFoundError):
        await career_entry_service.get_entry(db_session, 999_999)


async def test_update_entry_replaces_translations(db_session: AsyncSession, app_profile: Profile) -> None:
    """Provided translations replace the entry's existing rows."""
    entry = await career_entry_service.create_entry(db_session, profile_id=app_profile.id, data=_new_entry("A"))

    await career_entry_service.update_entry(
        db_session,
        entry.id,
        CareerEntryUpdate(translations={"de": CareerLocaleFieldsOut(description="Beschreibung")}),
    )

    fetched = await career_entry_service.get_entry(db_session, entry.id)
    assert [fetched.translations["de"].description] == ["Beschreibung"]


async def test_delete_entry_removes_the_entry(db_session: AsyncSession, app_profile: Profile) -> None:
    """A deleted entry can no longer be resolved."""
    entry = await career_entry_service.create_entry(db_session, profile_id=app_profile.id, data=_new_entry("A"))

    await career_entry_service.delete_entry(db_session, entry.id)

    with pytest.raises(CareerEntryNotFoundError):
        await career_entry_service.get_entry(db_session, entry.id)


async def test_reorder_entries_applies_requested_order(db_session: AsyncSession, app_profile: Profile) -> None:
    """Reordering returns the entries in the requested order."""
    first = await career_entry_service.create_entry(db_session, profile_id=app_profile.id, data=_new_entry("A"))
    second = await career_entry_service.create_entry(db_session, profile_id=app_profile.id, data=_new_entry("B"))

    rows = await career_entry_service.reorder_entries(db_session, app_profile.id, [second.id, first.id])

    assert [entry.position for entry, _name, _color in rows] == ["B", "A"]

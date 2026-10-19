"""Integration tests for the career-entry repository (real Postgres)."""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.repositories import career_entry_repository
from app.application.schemas.career_entry_schemas import (
    CareerEntryOut,
    CareerLocaleFieldsOut,
)
from app.shared.status.models.status import Status
from app.shared.status.repositories import statusable_repository

pytestmark = pytest.mark.integration


async def _entry(db: AsyncSession, profile: Profile, *, position: str, sort: int) -> CareerEntryOut:
    """Persist one career entry for the given profile and return its DTO."""
    return await career_entry_repository.create(
        db,
        application_profile_id=profile.id,
        position=position,
        start_date=date(2026, 1, 1),
        sort=sort,
    )


async def test_create_and_get_by_id_round_trips(db_session: AsyncSession, app_profile: Profile) -> None:
    """A created entry is readable by its id."""
    created = await _entry(db_session, app_profile, position="Dev", sort=0)

    fetched = await career_entry_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.position == "Dev"


async def test_get_by_id_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown id yields ``None``."""
    assert await career_entry_repository.get_by_id(db_session, 999_999) is None


async def test_get_by_profile_orders_by_sort_ascending(db_session: AsyncSession, app_profile: Profile) -> None:
    """Entries come back ordered by ``sort`` ascending."""
    await _entry(db_session, app_profile, position="Zweite", sort=1)
    await _entry(db_session, app_profile, position="Erste", sort=0)

    rows = await career_entry_repository.get_by_profile(db_session, app_profile.id)

    assert [entry.position for entry, _name, _color in rows] == ["Erste", "Zweite"]


async def test_get_max_sort_returns_zero_without_entries(db_session: AsyncSession, app_profile: Profile) -> None:
    """Without entries the maximum sort is 0."""
    assert await career_entry_repository.get_max_sort(db_session, app_profile.id) == 0


async def test_get_max_sort_returns_highest_sort(db_session: AsyncSession, app_profile: Profile) -> None:
    """With entries the maximum sort is the highest assigned value."""
    await _entry(db_session, app_profile, position="A", sort=2)
    await _entry(db_session, app_profile, position="B", sort=7)

    assert await career_entry_repository.get_max_sort(db_session, app_profile.id) == 7


async def test_reorder_reassigns_sort_to_requested_index(db_session: AsyncSession, app_profile: Profile) -> None:
    """Reordering rewrites ``sort`` so the requested order wins."""
    first = await _entry(db_session, app_profile, position="A", sort=0)
    second = await _entry(db_session, app_profile, position="B", sort=1)

    rows = await career_entry_repository.reorder(db_session, app_profile.id, [second.id, first.id])

    assert [entry.position for entry, _name, _color in rows] == ["B", "A"]


async def test_replace_translations_swaps_the_whole_set(db_session: AsyncSession, app_profile: Profile) -> None:
    """A second replacement keeps only the newly supplied rows."""
    entry = await _entry(db_session, app_profile, position="A", sort=0)
    await career_entry_repository.replace_translations(
        db_session,
        entry.id,
        {"de": CareerLocaleFieldsOut(description="DE"), "en": CareerLocaleFieldsOut(description="EN")},
    )

    await career_entry_repository.replace_translations(
        db_session,
        entry.id,
        {"de": CareerLocaleFieldsOut(description="NEU")},
    )

    fetched = await career_entry_repository.get_by_id(db_session, entry.id)
    assert fetched is not None
    assert list(fetched.translations) == ["de"]
    assert fetched.translations["de"].description == "NEU"


async def test_get_by_profile_active_only_filters_via_status(
    db_session: AsyncSession,
    app_profile: Profile,
    active_status: Status,
) -> None:
    """``active_only`` keeps only entries carrying the ``active`` status."""
    active = await _entry(db_session, app_profile, position="Aktiv", sort=0)
    await _entry(db_session, app_profile, position="Inaktiv", sort=1)
    await statusable_repository.set_status(db_session, "application_career_entry", active.id, active_status.id)

    rows = await career_entry_repository.get_by_profile(db_session, app_profile.id, active_only=True)

    assert [entry.position for entry, _name, _color in rows] == ["Aktiv"]

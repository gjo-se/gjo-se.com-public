"""Integration tests for the experience service (real Postgres)."""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationExperienceNotFoundError
from app.application.models.profile import Profile
from app.application.schemas.experience_schemas import (
    DecisionIn,
    DecisionLocaleFieldsOut,
    ExperienceCreate,
)
from app.application.services import experience_service

pytestmark = pytest.mark.integration


def _new_experience(position: str) -> ExperienceCreate:
    """Build a create payload for an experience project."""
    return ExperienceCreate(position=position, start_date=date(2026, 1, 1))


async def test_create_entry_assigns_incremental_sort(db_session: AsyncSession, app_profile: Profile) -> None:
    """A new experience receives ``max(sort) + 1``."""
    first = await experience_service.create_entry(db_session, profile_id=app_profile.id, data=_new_experience("A"))
    second = await experience_service.create_entry(db_session, profile_id=app_profile.id, data=_new_experience("B"))

    assert first.sort == 1
    assert second.sort == 2


async def test_create_entry_with_levels_persists_decisions(db_session: AsyncSession, app_profile: Profile) -> None:
    """Supplied child levels are written after the entry has an id."""
    data = ExperienceCreate(
        position="A",
        start_date=date(2026, 1, 1),
        decisions=[DecisionIn(translations={"de": DecisionLocaleFieldsOut(title="Entscheidung")})],
    )

    created = await experience_service.create_entry(db_session, profile_id=app_profile.id, data=data)

    fetched = await experience_service.get_entry(db_session, created.id)
    assert [d.translations["de"].title for d in fetched.decisions] == ["Entscheidung"]


async def test_get_entry_raises_when_missing(db_session: AsyncSession) -> None:
    """An unknown id raises a domain not-found error."""
    with pytest.raises(ApplicationExperienceNotFoundError):
        await experience_service.get_entry(db_session, 999_999)


async def test_delete_entry_removes_the_experience(db_session: AsyncSession, app_profile: Profile) -> None:
    """A deleted experience can no longer be resolved."""
    entry = await experience_service.create_entry(db_session, profile_id=app_profile.id, data=_new_experience("A"))

    await experience_service.delete_entry(db_session, entry.id)

    with pytest.raises(ApplicationExperienceNotFoundError):
        await experience_service.get_entry(db_session, entry.id)


async def test_reorder_entries_applies_requested_order(db_session: AsyncSession, app_profile: Profile) -> None:
    """Reordering returns the experiences in the requested order."""
    first = await experience_service.create_entry(db_session, profile_id=app_profile.id, data=_new_experience("A"))
    second = await experience_service.create_entry(db_session, profile_id=app_profile.id, data=_new_experience("B"))

    rows = await experience_service.reorder_entries(db_session, app_profile.id, [second.id, first.id])

    assert [entry.position for entry, _name, _color in rows] == ["B", "A"]

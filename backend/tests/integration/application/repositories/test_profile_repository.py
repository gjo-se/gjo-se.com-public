"""Integration tests for the singleton-profile repository (real Postgres)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.repositories import profile_repository
from app.application.schemas.profile_schemas import ProfileCreate, ProfileUpdate

pytestmark = pytest.mark.integration


async def test_get_profile_returns_none_without_a_row(db_session: AsyncSession) -> None:
    """An empty table yields ``None`` instead of raising."""
    assert await profile_repository.get_profile(db_session) is None


async def test_create_profile_persists_the_singleton(db_session: AsyncSession) -> None:
    """A created profile is persisted with an id and can be read back."""
    created = await profile_repository.create_profile(db_session, ProfileCreate(full_name="Greg Tester"))

    assert created.id is not None
    fetched = await profile_repository.get_profile(db_session)
    assert fetched is not None
    assert fetched.id == created.id


async def test_update_profile_persists_field_changes(db_session: AsyncSession) -> None:
    """Changes to a profile are flushed and visible on the next read."""
    await profile_repository.create_profile(db_session, ProfileCreate(full_name="Alt"))

    updated = await profile_repository.update_profile(db_session, ProfileUpdate(full_name="Neu"))

    assert updated is not None
    fetched = await profile_repository.get_profile(db_session)
    assert fetched is not None
    assert fetched.full_name == "Neu"

"""Integration tests for the singleton-profile service (real Postgres)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.repositories import profile_repository
from app.application.schemas.profile_schemas import (
    ProfileLocaleFieldsOut,
    ProfileUpdate,
)
from app.application.services import profile_service

pytestmark = pytest.mark.integration


async def test_upsert_profile_creates_the_singleton_when_empty(db_session: AsyncSession) -> None:
    """Without an existing profile the singleton is created."""
    created = await profile_service.upsert_profile(db_session, ProfileUpdate(full_name="Greg"))

    assert created.id is not None
    stored = await profile_repository.get_profile(db_session)
    assert stored is not None
    assert stored.full_name == "Greg"


async def test_upsert_profile_updates_an_existing_profile(db_session: AsyncSession, app_profile: Profile) -> None:
    """An existing singleton is updated, not replaced."""
    updated = await profile_service.upsert_profile(db_session, ProfileUpdate(full_name="Neu"))

    assert updated.id == app_profile.id
    assert updated.full_name == "Neu"


async def test_upsert_profile_rejects_unknown_locale(db_session: AsyncSession, app_profile: Profile) -> None:
    """A locale outside {de, en} is rejected before any row is written."""
    with pytest.raises(ValueError, match="fr"):
        await profile_service.upsert_profile(
            db_session,
            ProfileUpdate(full_name="Greg", translations={"fr": ProfileLocaleFieldsOut(story="Bonjour")}),
        )


async def test_upsert_profile_persists_allowed_locales(db_session: AsyncSession, app_profile: Profile) -> None:
    """Valid locales are persisted as translation rows."""
    await profile_service.upsert_profile(
        db_session,
        ProfileUpdate(
            full_name="Greg",
            translations={"de": ProfileLocaleFieldsOut(story="DE"), "en": ProfileLocaleFieldsOut(story="EN")},
        ),
    )

    db_session.expire_all()
    fetched = await profile_repository.get_profile(db_session)
    assert fetched is not None
    assert sorted(fetched.translations) == ["de", "en"]

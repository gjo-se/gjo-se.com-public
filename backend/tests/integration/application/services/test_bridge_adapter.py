"""Integration tests for the application-bridge adapter (real Postgres)."""

from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.repositories import profile_repository
from app.application.schemas.profile_schemas import ProfileCreate
from app.application.services.bridge_adapter import ApplicationBridgeAdapter
from app.fbf.models.project import Project

pytestmark = pytest.mark.integration


async def test_get_profile_base_rate_returns_none_without_profile(db_session: AsyncSession) -> None:
    """Without a stored profile the base rate is unknown."""
    assert await ApplicationBridgeAdapter().get_profile_base_rate(db_session) is None


async def test_get_profile_base_rate_returns_float_when_set(db_session: AsyncSession) -> None:
    """A stored hourly rate is returned as a float for the fbf context."""
    await profile_repository.create_profile(db_session, ProfileCreate(full_name="Greg", hourly_rate=Decimal("95.00")))

    rate = await ApplicationBridgeAdapter().get_profile_base_rate(db_session)

    assert rate == pytest.approx(95.0)


async def test_get_profile_base_rate_returns_none_when_unset(db_session: AsyncSession, app_profile: Profile) -> None:
    """A stored profile without an hourly rate yields ``None``."""
    assert await ApplicationBridgeAdapter().get_profile_base_rate(db_session) is None


async def test_move_submission_returns_false_without_source(db_session: AsyncSession, fbf_project: Project) -> None:
    """A source project without a current submission is a no-op (``False``)."""
    moved = await ApplicationBridgeAdapter().move_submission(
        db_session, from_project_id=fbf_project.id, to_project_id=fbf_project.id + 1
    )

    assert moved is False

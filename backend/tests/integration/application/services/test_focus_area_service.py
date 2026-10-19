"""Integration tests for the focus-area service (real Postgres)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import FocusAreaNotFoundError
from app.application.models.profile import Profile
from app.application.schemas.focus_area_schemas import (
    FocusAreaCreate,
    FocusAreaLocaleFieldsOut,
    FocusAreaUpdate,
)
from app.application.services import focus_area_service

pytestmark = pytest.mark.integration


def _new_area(slug: str) -> FocusAreaCreate:
    """Build a create payload for a focus area."""
    return FocusAreaCreate(slug=slug)


async def test_create_area_assigns_incremental_sort(db_session: AsyncSession, app_profile: Profile) -> None:
    """A new area receives ``max(sort) + 1``."""
    first = await focus_area_service.create_area(db_session, profile_id=app_profile.id, data=_new_area("ai"))
    second = await focus_area_service.create_area(db_session, profile_id=app_profile.id, data=_new_area("arch"))

    assert first.sort == 1
    assert second.sort == 2


async def test_get_area_raises_when_missing(db_session: AsyncSession) -> None:
    """An unknown id raises a domain not-found error."""
    with pytest.raises(FocusAreaNotFoundError):
        await focus_area_service.get_area(db_session, 999_999)


async def test_update_area_replaces_translations(db_session: AsyncSession, app_profile: Profile) -> None:
    """Provided translations replace the area's existing rows."""
    area = await focus_area_service.create_area(db_session, profile_id=app_profile.id, data=_new_area("ai"))

    await focus_area_service.update_area(
        db_session,
        area.id,
        FocusAreaUpdate(translations={"de": FocusAreaLocaleFieldsOut(title="Künstliche Intelligenz")}),
    )

    fetched = await focus_area_service.get_area(db_session, area.id)
    assert [fetched.translations["de"].title] == ["Künstliche Intelligenz"]


async def test_delete_area_removes_the_area(db_session: AsyncSession, app_profile: Profile) -> None:
    """A deleted area can no longer be resolved."""
    area = await focus_area_service.create_area(db_session, profile_id=app_profile.id, data=_new_area("ai"))

    await focus_area_service.delete_area(db_session, area.id)

    with pytest.raises(FocusAreaNotFoundError):
        await focus_area_service.get_area(db_session, area.id)


async def test_reorder_areas_applies_requested_order(db_session: AsyncSession, app_profile: Profile) -> None:
    """Reordering returns the areas in the requested order."""
    first = await focus_area_service.create_area(db_session, profile_id=app_profile.id, data=_new_area("a"))
    second = await focus_area_service.create_area(db_session, profile_id=app_profile.id, data=_new_area("b"))

    areas = await focus_area_service.reorder_areas(db_session, app_profile.id, [second.id, first.id])

    assert [area.slug for area in areas] == ["b", "a"]

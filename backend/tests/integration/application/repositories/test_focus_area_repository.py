"""Integration tests for the focus-area repository (real Postgres)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.repositories import focus_area_repository
from app.application.schemas.focus_area_schemas import (
    FocusAreaLocaleFieldsOut,
    FocusAreaOut,
)

pytestmark = pytest.mark.integration


async def _area(db: AsyncSession, profile: Profile, *, slug: str, sort: int) -> FocusAreaOut:
    """Persist one focus area for the given profile and return its DTO."""
    return await focus_area_repository.create(
        db,
        application_profile_id=profile.id,
        slug=slug,
        sort=sort,
    )


async def test_create_and_get_by_id_round_trips(db_session: AsyncSession, app_profile: Profile) -> None:
    """A created area is readable by its id with its translations loaded."""
    created = await _area(db_session, app_profile, slug="ai", sort=0)

    fetched = await focus_area_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.slug == "ai"


async def test_get_by_id_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown id yields ``None``."""
    assert await focus_area_repository.get_by_id(db_session, 999_999) is None


async def test_get_by_profile_orders_by_sort_ascending(db_session: AsyncSession, app_profile: Profile) -> None:
    """Areas come back ordered by ``sort`` ascending."""
    await _area(db_session, app_profile, slug="second", sort=2)
    await _area(db_session, app_profile, slug="first", sort=1)

    areas = await focus_area_repository.get_by_profile(db_session, app_profile.id)

    assert [area.slug for area in areas] == ["first", "second"]


async def test_get_max_sort_returns_zero_without_areas(db_session: AsyncSession, app_profile: Profile) -> None:
    """Without areas the maximum sort is 0."""
    assert await focus_area_repository.get_max_sort(db_session, app_profile.id) == 0


async def test_replace_translations_swaps_the_whole_set(db_session: AsyncSession, app_profile: Profile) -> None:
    """A replacement keeps only the newly supplied translation rows."""
    area = await _area(db_session, app_profile, slug="ai", sort=0)
    await focus_area_repository.replace_translations(
        db_session,
        area.id,
        {"de": FocusAreaLocaleFieldsOut(title="KI", summary="A"), "en": FocusAreaLocaleFieldsOut(title="AI")},
    )

    await focus_area_repository.replace_translations(
        db_session,
        area.id,
        {"de": FocusAreaLocaleFieldsOut(title="KI neu")},
    )

    fetched = await focus_area_repository.get_by_id(db_session, area.id)
    assert fetched is not None
    assert list(fetched.translations) == ["de"]
    assert fetched.translations["de"].title == "KI neu"


async def test_reorder_reassigns_sort_to_requested_index(db_session: AsyncSession, app_profile: Profile) -> None:
    """Reordering rewrites ``sort`` so the requested order wins."""
    first = await _area(db_session, app_profile, slug="a", sort=0)
    second = await _area(db_session, app_profile, slug="b", sort=1)

    areas = await focus_area_repository.reorder(db_session, app_profile.id, [second.id, first.id])

    assert [area.slug for area in areas] == ["b", "a"]


async def test_delete_removes_the_area(db_session: AsyncSession, app_profile: Profile) -> None:
    """A deleted area is gone afterwards."""
    area = await _area(db_session, app_profile, slug="ai", sort=0)

    await focus_area_repository.delete(db_session, area.id)

    assert await focus_area_repository.get_by_id(db_session, area.id) is None

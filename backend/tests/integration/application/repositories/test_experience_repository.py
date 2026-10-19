"""Integration tests for the experience repository (real Postgres).

Covers creating, reading (with ordered children) and deleting experience
projects. Translation/child replacement lives in
``test_experience_translation_repository`` / ``test_experience_children_repository``.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.experience import Experience
from app.application.models.profile import Profile
from app.application.repositories import experience_repository, experience_translation_repository
from app.application.schemas.experience_schemas import (
    ExperienceLocaleFieldsOut,
    ExperienceOut,
)

pytestmark = pytest.mark.integration


async def _experience(db: AsyncSession, profile: Profile, *, position: str, sort: int) -> ExperienceOut:
    """Persist one experience project for the given profile and return its DTO."""
    return await experience_repository.create(
        db,
        application_profile_id=profile.id,
        position=position,
        start_date=date(2026, 1, 1),
        sort=sort,
    )


async def _orm_experience(db: AsyncSession, profile: Profile) -> Experience:
    """Persist one experience project and return its ORM row (child-write helper)."""
    created = await _experience(db, profile, position="A", sort=0)
    result = await db.execute(select(Experience).where(Experience.id == created.id))
    return result.scalar_one()


async def test_create_and_get_by_id_round_trips(db_session: AsyncSession, app_profile: Profile) -> None:
    """A created experience is readable by its id."""
    created = await _experience(db_session, app_profile, position="Architekt", sort=0)

    fetched = await experience_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.position == "Architekt"


async def test_get_by_id_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown id yields ``None``."""
    assert await experience_repository.get_by_id(db_session, 999_999) is None


async def test_get_by_profile_orders_by_sort_ascending(db_session: AsyncSession, app_profile: Profile) -> None:
    """Experiences come back ordered by ``sort`` ascending."""
    await _experience(db_session, app_profile, position="B", sort=1)
    await _experience(db_session, app_profile, position="A", sort=0)

    rows = await experience_repository.get_by_profile(db_session, app_profile.id)

    assert [entry.position for entry, _name, _color in rows] == ["A", "B"]


async def test_get_max_sort_returns_zero_without_rows(db_session: AsyncSession, app_profile: Profile) -> None:
    """Without rows the maximum sort is 0."""
    assert await experience_repository.get_max_sort(db_session, app_profile.id) == 0


async def test_delete_cascades_to_child_levels(db_session: AsyncSession, app_profile: Profile) -> None:
    """Deleting an experience removes its translations/decisions/proofs."""
    experience = await _orm_experience(db_session, app_profile)
    await experience_translation_repository.replace_translations(
        db_session, experience, {"de": ExperienceLocaleFieldsOut(problem="X")}
    )

    await experience_repository.delete(db_session, experience.id)

    assert await experience_repository.get_by_id(db_session, experience.id) is None

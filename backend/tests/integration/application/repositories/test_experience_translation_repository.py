"""Integration tests for ``experience_translation_repository`` (real Postgres).

Covers the translation-table replacement pattern with explicit foreign-key
inserts.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.experience import Experience
from app.application.models.profile import Profile
from app.application.repositories import experience_repository, experience_translation_repository
from app.application.schemas.experience_schemas import ExperienceLocaleFieldsOut

pytestmark = pytest.mark.integration


async def _experience(db: AsyncSession, profile: Profile) -> Experience:
    """Persist one experience project and return its ORM row."""
    created = await experience_repository.create(
        db,
        application_profile_id=profile.id,
        position="A",
        start_date=date(2026, 1, 1),
        sort=0,
    )
    result = await db.execute(select(Experience).where(Experience.id == created.id))
    return result.scalar_one()


async def test_replace_translations_swaps_the_whole_set(db_session: AsyncSession, app_profile: Profile) -> None:
    """A replacement keeps only the newly supplied translation rows."""
    experience = await _experience(db_session, app_profile)
    await experience_translation_repository.replace_translations(
        db_session,
        experience,
        {"de": ExperienceLocaleFieldsOut(problem="DE"), "en": ExperienceLocaleFieldsOut(problem="EN")},
    )

    await experience_translation_repository.replace_translations(
        db_session, experience, {"de": ExperienceLocaleFieldsOut(problem="NEU")}
    )

    fetched = await experience_repository.get_by_id(db_session, experience.id)
    assert fetched is not None
    assert list(fetched.translations) == ["de"]
    assert fetched.translations["de"].problem == "NEU"

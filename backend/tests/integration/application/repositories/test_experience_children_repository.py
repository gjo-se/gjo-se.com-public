"""Integration tests for ``experience_children_repository`` (real Postgres).

Covers the ordered decision/proof rebuild (list order defines ``sort``).
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.experience import Experience
from app.application.models.profile import Profile
from app.application.repositories import experience_children_repository, experience_repository
from app.application.schemas.experience_schemas import (
    DecisionIn,
    DecisionLocaleFieldsOut,
    ProofIn,
    ProofLocaleFieldsOut,
)

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


async def test_replace_decisions_assigns_sort_by_list_order(db_session: AsyncSession, app_profile: Profile) -> None:
    """Decisions are rebuilt with ``sort`` equal to their list position."""
    experience = await _experience(db_session, app_profile)

    await experience_children_repository.replace_decisions(
        db_session,
        experience,
        [
            DecisionIn(translations={"de": DecisionLocaleFieldsOut(title="Erste")}),
            DecisionIn(translations={"de": DecisionLocaleFieldsOut(title="Zweite")}),
        ],
    )

    fetched = await experience_repository.get_by_id(db_session, experience.id)
    assert fetched is not None
    assert [(d.sort, d.translations["de"].title) for d in fetched.decisions] == [(0, "Erste"), (1, "Zweite")]


async def test_replace_proofs_rebuilds_the_list(db_session: AsyncSession, app_profile: Profile) -> None:
    """Proofs are replaced in one ordered rebuild."""
    experience = await _experience(db_session, app_profile)
    await experience_children_repository.replace_proofs(
        db_session,
        experience,
        [ProofIn(translations={"de": ProofLocaleFieldsOut(text="Alt")})],
    )

    await experience_children_repository.replace_proofs(
        db_session,
        experience,
        [ProofIn(translations={"de": ProofLocaleFieldsOut(text="Neu")})],
    )

    fetched = await experience_repository.get_by_id(db_session, experience.id)
    assert fetched is not None
    assert [p.translations["de"].text for p in fetched.proofs] == ["Neu"]

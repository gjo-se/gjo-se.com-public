"""Integration tests for ``level_definition_repository``.

Verifies the level taxonomy access against the real (container) database:
listing order by the primary key, single lookup including the missing case, and
persistence of an update. Public interface only.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.level_definition import LevelDefinition
from app.fbf.repositories import level_definition_repository

pytestmark = pytest.mark.integration


async def test_get_all_returns_definitions_ordered_by_level(db_session: AsyncSession) -> None:
    """The listing is ordered ascending by the level primary key."""
    db_session.add_all(
        [
            LevelDefinition(level=2, label="Fortgeschritten", description="Fortgeschrittenes Niveau"),
            LevelDefinition(level=0, label="Unbekannt", description="Kein Niveau"),
            LevelDefinition(level=5, label="Experte", description="Expertenniveau"),
        ]
    )
    await db_session.flush()

    rows = await level_definition_repository.get_all(db_session)

    assert [row.level for row in rows] == [0, 2, 5]


async def test_update_returns_none_for_missing_definition(db_session: AsyncSession) -> None:
    """A level without a persisted definition yields None."""
    assert await level_definition_repository.update(db_session, 5, label="X", description=None) is None


async def test_update_persists_changed_label(db_session: AsyncSession) -> None:
    """A changed label is persisted and returned as DTO."""
    db_session.add(LevelDefinition(level=1, label="Alt", description="Alte Beschreibung"))
    await db_session.flush()

    updated = await level_definition_repository.update(db_session, 1, label="Neu", description=None)

    assert updated is not None
    assert updated.label == "Neu"

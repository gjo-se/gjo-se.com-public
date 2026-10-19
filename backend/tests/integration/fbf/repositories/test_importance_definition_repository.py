"""Integration tests for ``importance_definition_repository``.

Verifies the importance taxonomy access against the real (container) database:
listing order by the primary key, single lookup including the missing case, and
persistence of an update. Public interface only.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.importance_definition import ImportanceDefinition
from app.fbf.repositories import importance_definition_repository

pytestmark = pytest.mark.integration


async def test_get_all_returns_definitions_ordered_by_importance(db_session: AsyncSession) -> None:
    """The listing is ordered ascending by the importance primary key."""
    db_session.add_all(
        [
            ImportanceDefinition(importance=3, label="Hoch", description="Hohe Bedeutung"),
            ImportanceDefinition(importance=0, label="Unbewertet", description="Keine Bewertung"),
            ImportanceDefinition(importance=5, label="Kritisch", description="Kritische Bedeutung"),
        ]
    )
    await db_session.flush()

    rows = await importance_definition_repository.get_all(db_session)

    assert [row.importance for row in rows] == [0, 3, 5]


async def test_update_returns_none_for_missing_definition(db_session: AsyncSession) -> None:
    """An importance without a persisted definition yields None."""
    assert await importance_definition_repository.update(db_session, 5, label="X", description=None) is None


async def test_update_persists_changed_label(db_session: AsyncSession) -> None:
    """A changed label is persisted and returned as DTO."""
    db_session.add(ImportanceDefinition(importance=2, label="Alt", description="Alte Beschreibung"))
    await db_session.flush()

    updated = await importance_definition_repository.update(db_session, 2, label="Neu", description=None)

    assert updated is not None
    assert updated.label == "Neu"

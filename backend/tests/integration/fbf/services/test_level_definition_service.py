"""Integration tests for ``level_definition_service``.

Public interface only: listing order, the 404 on an unknown level and the
persisted label update against the real (container) database.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.level_definition import LevelDefinition
from app.fbf.services import level_definition_service

pytestmark = pytest.mark.integration


async def test_list_definitions_returns_rows_ordered_by_level(db_session: AsyncSession) -> None:
    """The service returns the definitions ordered ascending by level."""
    db_session.add_all(
        [
            LevelDefinition(level=3, label="Fortgeschritten", description="Fortgeschrittene Stufe"),
            LevelDefinition(level=1, label="Grundlagen", description="Grundlagen-Stufe"),
        ]
    )
    await db_session.flush()

    rows = await level_definition_service.list_definitions(db_session)

    assert [row.level for row in rows] == [1, 3]


async def test_update_definition_missing_raises_404(db_session: AsyncSession) -> None:
    """An unknown level yields a 404 HTTPException."""
    with pytest.raises(HTTPException) as excinfo:
        await level_definition_service.update_definition(db_session, 5, label="X", description=None)

    assert excinfo.value.status_code == 404


async def test_update_definition_persists_new_label(db_session: AsyncSession) -> None:
    """A changed label is persisted and returned as DTO."""
    db_session.add(LevelDefinition(level=2, label="Alt", description="Alte Beschreibung"))
    await db_session.flush()

    updated = await level_definition_service.update_definition(db_session, 2, label="Neu", description=None)

    assert updated.label == "Neu"

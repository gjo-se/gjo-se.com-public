"""Unit tests for the domain-free service load helper."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.service_helpers import load_all_or_raise

pytestmark = pytest.mark.integration


@dataclass
class _Entity:
    """Minimal entity with the ``id`` required by the helper protocol."""

    id: int


def _loader_returning(items_by_id: dict[int, _Entity]):
    """Build a repository-style loader returning the known ids from *items_by_id*."""

    async def _load(_db: AsyncSession, ids: list[int]) -> Sequence[_Entity]:
        return [items_by_id[i] for i in ids if i in items_by_id]

    return _load


def _db() -> AsyncSession:
    """Return a placeholder session – the fake loader never touches it."""
    return cast(AsyncSession, object())


async def test_load_all_or_raise_returns_all_found_items_in_order() -> None:
    """When every id exists the helper returns the loaded items."""
    items = {1: _Entity(1), 2: _Entity(2)}

    result = await load_all_or_raise(_loader_returning(items), _db(), [1, 2], label="Items")

    assert [item.id for item in result] == [1, 2]


async def test_load_all_or_raise_reports_missing_ids() -> None:
    """A missing id raises ValueError naming the missing id and the label."""
    items = {1: _Entity(1)}

    with pytest.raises(ValueError, match="Items not found: \\[2\\]"):
        await load_all_or_raise(_loader_returning(items), _db(), [1, 2], label="Items")

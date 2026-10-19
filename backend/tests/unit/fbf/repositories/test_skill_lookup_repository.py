"""Unit-Tests für das Skill-Lookup-Repository (public + similarity).

``find_skill_by_cosine`` ist rein in-memory über die geladenen Vektoren und
wird hier mit einer Fake-Session (feste Row-Liste) verhaltensbasiert geprüft.
"""

from __future__ import annotations

import inspect
from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.repositories import skill_lookup_repository as repo

pytestmark = pytest.mark.unit


class _Result:
    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def all(self) -> list[Any]:
        return self._rows


class _FakeDB:
    """Minimal async session double for the in-memory cosine lookup."""

    def __init__(self, rows: list[Any], hit: Any = None) -> None:
        self._rows = rows
        self._hit = hit
        self.get_calls: list[int] = []

    async def execute(self, _stmt: Any) -> _Result:
        return _Result(self._rows)

    async def get(self, _model: Any, pk: int) -> Any:
        self.get_calls.append(pk)
        if self._hit is not None:
            return self._hit
        # The repository maps the ORM row to ``SkillRef``; the double mirrors
        # the row's columns so the boundary mapping can run.
        return SimpleNamespace(
            id=pk,
            name="",
            description=None,
            importance=None,
            level=None,
            level_public=None,
            canonical_id=None,
            group_id=None,
            sort=None,
            vector=None,
        )


def test_get_public_skills_is_async() -> None:
    """get_public_skills ist eine async Repository-Funktion."""
    assert inspect.iscoroutinefunction(repo.get_public_skills)


@pytest.mark.asyncio
async def test_find_skill_by_cosine_returns_best_match() -> None:
    """The row with the highest cosine similarity wins."""
    rows = [
        (1, "orthogonal", None, [0.0, 1.0]),
        (2, "aligned", None, [1.0, 0.0]),
    ]
    db = _FakeDB(rows)

    match = await repo.find_skill_by_cosine(db, [1.0, 0.0], threshold=0.85)

    assert match is not None
    assert match.id == 2
    assert db.get_calls == [2]


@pytest.mark.asyncio
async def test_find_skill_by_cosine_below_threshold_returns_none() -> None:
    """A best similarity below the threshold yields None (no fetch)."""
    rows = [(1, "diagonal", None, [1.0, 1.0])]
    db = _FakeDB(rows)

    match = await repo.find_skill_by_cosine(db, [1.0, 0.0], threshold=0.99)

    assert match is None
    assert db.get_calls == []


@pytest.mark.asyncio
async def test_find_skill_by_cosine_skips_null_vectors() -> None:
    """Rows without a vector are ignored."""
    rows = [(1, "empty", None, None), (2, "aligned", None, [1.0, 0.0])]
    db = _FakeDB(rows)

    match = await repo.find_skill_by_cosine(db, [1.0, 0.0], threshold=0.5)

    assert match is not None
    assert match.id == 2

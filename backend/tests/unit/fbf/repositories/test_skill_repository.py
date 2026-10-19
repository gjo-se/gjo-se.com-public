"""Unit-Tests für das Skill-Repository (Modul-Struktur + Group-Change-Sort)."""

from __future__ import annotations

from typing import Any

import pytest

from app.fbf.models.skill import Skill
from app.fbf.repositories import skill_repository as repo

pytestmark = pytest.mark.unit


class TestSkillRepository:
    """Tests für Skill-Repository-Struktur und Interfaces."""

    def test_skill_repository_module_structure(self) -> None:
        """Repository-Modul sollte mindestens eine Funktion haben."""
        functions = [item for item in dir(repo) if callable(getattr(repo, item)) and not item.startswith("_")]
        assert len(functions) >= 1


class _FakeDB:
    """Minimal async session double for the in-memory ``update`` use-case."""

    def __init__(self, skill: Skill) -> None:
        self._skill = skill

    async def get(self, _model: Any, _pk: int) -> Any:
        return self._skill

    async def flush(self) -> None:
        return None

    async def refresh(self, _obj: Any) -> None:
        return None


class TestSkillUpdateSort:
    """The group-relative ``sort`` is re-derived on a group change (partial unique index)."""

    @pytest.mark.asyncio
    async def test_update_appends_to_new_group(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A group change re-derives the sort from the target group."""
        skill = Skill(name="Docker", group_id=2, sort=1)
        calls: dict[str, int] = {}

        async def _next(_db: Any, group_id: int) -> int:
            calls["group"] = group_id
            return 5

        monkeypatch.setattr(repo, "next_sort_for_group", _next)

        updated = await repo.update(_FakeDB(skill), 1, {"group_id": 2}, previous_group_id=1)

        assert skill.sort == 5
        assert calls["group"] == 2
        assert updated is not None
        assert updated.group_id == 2

    @pytest.mark.asyncio
    async def test_update_clears_sort_when_group_removed(self) -> None:
        """Removing the group clears the sort."""
        skill = Skill(name="Docker", group_id=1, sort=3)

        updated = await repo.update(_FakeDB(skill), 1, {"group_id": None}, previous_group_id=1)

        assert skill.sort is None
        assert updated is not None

    @pytest.mark.asyncio
    async def test_update_keeps_sort_without_group_change(self) -> None:
        """Without a group change the sort is left untouched."""
        skill = Skill(name="Docker", group_id=1, sort=3)

        updated = await repo.update(_FakeDB(skill), 1, {"name": "Docker Compose"}, previous_group_id=1)

        assert skill.sort == 3
        assert updated is not None
        assert updated.name == "Docker Compose"

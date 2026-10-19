"""Unit tests for the public skill service (id guard, delegation)."""

from __future__ import annotations

from typing import Any

import pytest

from app.fbf.services import skill_public_service

pytestmark = pytest.mark.unit


# ── get_project_public_skills (id guard) ─────────────────────────────────────


@pytest.mark.asyncio
async def test_get_project_public_skills_rejects_out_of_range_ids() -> None:
    """Ids below 1 or above the int32 max are rejected without a DB hit."""
    assert await skill_public_service.get_project_public_skills(None, 0) is None
    assert await skill_public_service.get_project_public_skills(None, -5) is None
    assert await skill_public_service.get_project_public_skills(None, skill_public_service._PROJECT_ID_MAX + 1) is None


@pytest.mark.asyncio
async def test_get_project_public_skills_returns_none_for_missing_project(monkeypatch: pytest.MonkeyPatch) -> None:
    """A valid id whose project is missing yields None."""

    async def _exists(_db: Any, _project_id: int) -> bool:
        return False

    monkeypatch.setattr(skill_public_service.project_repository, "exists", _exists)

    assert await skill_public_service.get_project_public_skills(None, 5) is None


# ── list_public_skills (delegation) ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_public_skills_delegates_to_lookup_repository(monkeypatch: pytest.MonkeyPatch) -> None:
    """The service forwards its arguments to the lookup repository unchanged."""
    calls: dict[str, Any] = {}

    async def _get(
        _db: Any,
        *,
        group_id: int | None,
        limit: int | None,
        tag: str,
        grouped_only: bool,
    ) -> list[tuple[str, float]]:
        calls.update(group_id=group_id, limit=limit, tag=tag, grouped_only=grouped_only)
        return [("sentinel", 1.0)]

    monkeypatch.setattr(skill_public_service.skill_lookup_repository, "get_public_skills", _get)

    result = await skill_public_service.list_public_skills(None, group_id=3, tag="site:promo", grouped_only=True)

    assert result == [("sentinel", 1.0)]
    assert calls == {"group_id": 3, "limit": None, "tag": "site:promo", "grouped_only": True}

"""Unit tests for the pure skill-service helpers.

``effective_importance`` equal-weight blends three independent importance
sources with NULL-fallback. The DB-backed skill functions of the same module
are covered on the integration level.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import HTTPException

from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.schemas.skill_schemas import SkillUpdate
from app.fbf.services import skill_service
from app.fbf.services.skill_service import effective_importance

pytestmark = pytest.mark.unit


def _skill(importance: int | None) -> SkillRef:
    """Build an in-memory skill DTO with the given curated importance."""
    return SkillRef(
        id=1,
        name="Skill",
        description=None,
        importance=importance,
        level=None,
        level_public=None,
        canonical_id=None,
        group_id=None,
        sort=None,
        vector=None,
    )


def test_effective_importance_averages_all_three_sources() -> None:
    """All three sources present yield their arithmetic mean."""
    assert effective_importance(_skill(4), 3.0, 5.0) == pytest.approx(4.0)


def test_effective_importance_redistributes_when_project_source_missing() -> None:
    """A NULL source is dropped and the weight is redistributed over the rest."""
    assert effective_importance(_skill(4), None, 5.0) == pytest.approx(4.5)


def test_effective_importance_single_source_returns_that_value() -> None:
    """Only the curated importance present yields that value unchanged."""
    assert effective_importance(_skill(5), None, None) == pytest.approx(5.0)


def test_effective_importance_returns_zero_when_all_sources_null() -> None:
    """Without any source the effective importance is 0.0."""
    assert effective_importance(_skill(None), None, None) == 0.0


def test_effective_importance_avg_only() -> None:
    """Only the global average present yields that value."""
    assert effective_importance(_skill(None), None, 4.2) == pytest.approx(4.2)


# ── guarded deletes / reject / reassign (repository doubles) ─────────────────


def _patch_skill_repo(monkeypatch: pytest.MonkeyPatch, **fns: Any) -> None:
    for name, fn in fns.items():
        monkeypatch.setattr(skill_service.skill_repository, name, fn)


@pytest.mark.asyncio
async def test_delete_guarded_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deleting a missing skill raises 404."""

    async def _get(_db: Any, _sid: int) -> None:
        return None

    _patch_skill_repo(monkeypatch, get_by_id=_get)

    with pytest.raises(HTTPException) as exc_info:
        await skill_service.delete_guarded(None, 1)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_guarded_in_use(monkeypatch: pytest.MonkeyPatch) -> None:
    """A still-referenced skill raises 409."""

    async def _get(_db: Any, _sid: int) -> Any:
        return SimpleNamespace(id=1)

    async def _count(_db: Any, _sid: int) -> int:
        return 3

    _patch_skill_repo(monkeypatch, get_by_id=_get, count_referencing_projects=_count)

    with pytest.raises(HTTPException) as exc_info:
        await skill_service.delete_guarded(None, 1)

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_reject_non_pending_skill_raises_400(monkeypatch: pytest.MonkeyPatch) -> None:
    """A skill that is not pending cannot be rejected."""

    async def _get(_db: Any, _sid: int) -> Any:
        return SimpleNamespace(id=1)

    async def _status(_db: Any, _type: str, _sid: int) -> None:
        return None

    _patch_skill_repo(monkeypatch, get_by_id=_get)
    monkeypatch.setattr(skill_service.statusable_repository, "get_status", _status)

    with pytest.raises(HTTPException) as exc_info:
        await skill_service.reject(None, 1, None)

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_reassign_projects_missing_source_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reassigning from a missing source skill raises 404."""

    async def _get(_db: Any, _sid: int) -> None:
        return None

    _patch_skill_repo(monkeypatch, get_by_id=_get)

    with pytest.raises(HTTPException) as exc_info:
        await skill_service.reassign_projects(None, 1, 2)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_reassign_projects_missing_target_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reassigning to a missing target skill raises 404."""

    async def _get(_db: Any, sid: int) -> Any:
        return SimpleNamespace(id=sid) if sid == 1 else None

    _patch_skill_repo(monkeypatch, get_by_id=_get)

    with pytest.raises(HTTPException) as exc_info:
        await skill_service.reassign_projects(None, 1, 2)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_reassign_projects_without_target_removes_links(monkeypatch: pytest.MonkeyPatch) -> None:
    """A None target drops the links without a target lookup."""
    calls: dict[str, Any] = {}

    async def _get(_db: Any, sid: int) -> Any:
        return SimpleNamespace(id=sid)

    async def _reassign(_db: Any, skill_id: int, target_id: int | None) -> int:
        calls["args"] = (skill_id, target_id)
        return 4

    class _DB:
        async def commit(self) -> None:
            calls["committed"] = True

    _patch_skill_repo(monkeypatch, get_by_id=_get, reassign_projects=_reassign)

    assert await skill_service.reassign_projects(_DB(), 1, None) == 4
    assert calls["args"] == (1, None)
    assert calls["committed"] is True


# ── update_skill (delegation + previous-group forwarding) ────────────────────


@pytest.mark.asyncio
async def test_update_skill_returns_none_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """An unknown skill id yields ``None`` without touching the repository update."""

    async def _get(_db: Any, _sid: int) -> None:
        return None

    _patch_skill_repo(monkeypatch, get_by_id=_get)

    assert await skill_service.update_skill(None, 1, SkillUpdate(name="Python")) is None


@pytest.mark.asyncio
async def test_update_skill_forwards_changes_and_previous_group(monkeypatch: pytest.MonkeyPatch) -> None:
    """The existing skill's group is forwarded so the sort can be re-derived."""
    existing = SimpleNamespace(id=1, group_id=3)
    captured: dict[str, Any] = {}

    async def _get(_db: Any, _sid: int) -> Any:
        return existing

    async def _update(_db: Any, skill_id: int, changes: dict[str, Any], *, previous_group_id: int | None) -> Any:
        captured.update(skill_id=skill_id, changes=changes, previous_group_id=previous_group_id)
        return SimpleNamespace(id=skill_id, group_id=5)

    _patch_skill_repo(monkeypatch, get_by_id=_get, update=_update)

    out = await skill_service.update_skill(None, 1, SkillUpdate(name="Python", group_id=5))

    assert captured["skill_id"] == 1
    assert captured["previous_group_id"] == 3
    assert captured["changes"]["group_id"] == 5
    assert out is not None
    assert out.group_id == 5

"""Unit tests for the skill-group service (public locale pick + guarded delete)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import HTTPException

from app.fbf.repositories.skill_group_repository import SkillGroupRef
from app.fbf.services import skill_group_service

pytestmark = pytest.mark.unit


def _group(labels: dict[str, str], gid: int = 1) -> SkillGroupRef:
    """Build an in-memory group DTO with the given locale→label map."""
    return SkillGroupRef(id=gid, sort=0, priority="medium", labels=labels)


def _patch_group_repo(monkeypatch: pytest.MonkeyPatch, **fns: Any) -> None:
    for name, fn in fns.items():
        monkeypatch.setattr(skill_group_service.skill_group_repository, name, fn)


# ── list_public_groups (locale pick, public behavior) ────────────────────────


@pytest.mark.asyncio
async def test_list_public_groups_picks_requested_locale(monkeypatch: pytest.MonkeyPatch) -> None:
    """The requested locale label wins over the German fallback."""

    async def _get(_db: Any) -> list[Any]:
        return [_group({"de": "DE", "en": "EN"})]

    _patch_group_repo(monkeypatch, get_public_groups=_get)

    result = await skill_group_service.list_public_groups(None, "en")

    assert result[0].label == "EN"


@pytest.mark.asyncio
async def test_list_public_groups_falls_back_to_german(monkeypatch: pytest.MonkeyPatch) -> None:
    """An unknown locale falls back to the German label."""

    async def _get(_db: Any) -> list[Any]:
        return [_group({"de": "DE"})]

    _patch_group_repo(monkeypatch, get_public_groups=_get)

    result = await skill_group_service.list_public_groups(None, "fr")

    assert result[0].label == "DE"


@pytest.mark.asyncio
async def test_list_public_groups_empty_label_without_translation(monkeypatch: pytest.MonkeyPatch) -> None:
    """A group without any matching translation yields an empty label."""

    async def _get(_db: Any) -> list[Any]:
        return [_group({})]

    _patch_group_repo(monkeypatch, get_public_groups=_get)

    result = await skill_group_service.list_public_groups(None, "de")

    assert result[0].label == ""


# ── delete_group_guarded (repository doubles) ────────────────────────────────


@pytest.mark.asyncio
async def test_delete_group_guarded_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deleting a missing group raises 404."""

    async def _get(_db: Any, _gid: int) -> None:
        return None

    _patch_group_repo(monkeypatch, get_group_by_id=_get)

    with pytest.raises(HTTPException) as exc_info:
        await skill_group_service.delete_group_guarded(None, 1)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_group_guarded_in_use(monkeypatch: pytest.MonkeyPatch) -> None:
    """A group still referenced by skills raises 409."""

    async def _get(_db: Any, _gid: int) -> Any:
        return _group({"de": "DE"})

    async def _count(_db: Any, _gid: int) -> int:
        return 2

    monkeypatch.setattr(skill_group_service.skill_group_repository, "get_group_by_id", _get)
    monkeypatch.setattr(skill_group_service.skill_repository, "count_by_group", _count)

    with pytest.raises(HTTPException) as exc_info:
        await skill_group_service.delete_group_guarded(None, 1)

    assert exc_info.value.status_code == 409


# ── admin mapping / list / update / create / reorder / delete-ok ─────────────


class _Config:
    def __init__(self, **kw: Any) -> None:
        self._data = kw
        for key, value in kw.items():
            setattr(self, key, value)

    def model_dump(self, *, exclude_unset: bool = False) -> dict[str, Any]:
        return dict(self._data)


class _DB:
    def __init__(self) -> None:
        self.committed = 0

    async def commit(self) -> None:
        self.committed += 1


def test_to_group_admin_out_maps_fields_and_count() -> None:
    out = skill_group_service._to_group_admin_out(_group({"de": "DE", "en": "EN"}), 4)
    assert out.id == 1
    assert out.sort == 0
    assert out.priority == "medium"
    assert out.labels == {"de": "DE", "en": "EN"}
    assert out.skill_count == 4


@pytest.mark.asyncio
async def test_list_admin_groups_attaches_counts(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _groups(_db: Any) -> list[Any]:
        return [_group({"de": "A"}, 1), _group({"de": "B"}, 2)]

    async def _counts(_db: Any) -> dict[int, int]:
        return {1: 3}

    _patch_group_repo(monkeypatch, get_groups_with_translations=_groups)
    monkeypatch.setattr(skill_group_service.skill_repository, "count_by_group_ids", _counts)

    result = await skill_group_service.list_admin_groups(None)
    assert result[0].skill_count == 3
    assert result[1].skill_count == 0  # missing id → default 0


@pytest.mark.asyncio
async def test_update_group_returns_admin_out_with_count(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    async def _update(_db: Any, gid: int, *, sort: Any, priority: Any, labels: Any) -> Any:
        seen.update({"gid": gid, "sort": sort, "priority": priority, "labels": labels})
        return _group({"de": "X"})

    async def _count(_db: Any, _gid: int) -> int:
        return 5

    _patch_group_repo(monkeypatch, update_group=_update)
    monkeypatch.setattr(skill_group_service.skill_repository, "count_by_group", _count)

    out = await skill_group_service.update_group(_DB(), 7, _Config(sort=2, priority="high"))
    assert seen["gid"] == 7
    assert seen["sort"] == 2
    assert out.skill_count == 5


@pytest.mark.asyncio
async def test_update_group_missing_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(*_a: Any, **_k: Any) -> None:
        return None

    _patch_group_repo(monkeypatch, update_group=_none)

    with pytest.raises(HTTPException) as exc_info:
        await skill_group_service.update_group(_DB(), 7, _Config(priority="high"))
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_create_group_returns_zero_count(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _create(_db: Any, *, labels: Any, priority: Any) -> Any:
        return _group({"de": "New"})

    _patch_group_repo(monkeypatch, create_group=_create)

    out = await skill_group_service.create_group(_DB(), _Config(labels={"de": "New"}, priority="low"))
    assert out.skill_count == 0


@pytest.mark.asyncio
async def test_reorder_groups_returns_count(monkeypatch: pytest.MonkeyPatch) -> None:
    called: list[list[int]] = []

    async def _reorder(_db: Any, ids: list[int]) -> None:
        called.append(ids)

    _patch_group_repo(monkeypatch, reorder_groups=_reorder)

    payload = SimpleNamespace(ordered_ids=[3, 1, 2])
    assert await skill_group_service.reorder_groups(_DB(), payload) == 3
    assert called == [[3, 1, 2]]


@pytest.mark.asyncio
async def test_delete_group_guarded_success_deletes_and_commits(monkeypatch: pytest.MonkeyPatch) -> None:
    deleted: list[int] = []

    async def _get(_db: Any, _gid: int) -> Any:
        return _group({"de": "DE"})

    async def _count(_db: Any, _gid: int) -> int:
        return 0

    async def _delete(_db: Any, gid: int) -> None:
        deleted.append(gid)

    monkeypatch.setattr(skill_group_service.skill_group_repository, "get_group_by_id", _get)
    monkeypatch.setattr(skill_group_service.skill_repository, "count_by_group", _count)
    _patch_group_repo(monkeypatch, delete_group=_delete)

    db = _DB()
    await skill_group_service.delete_group_guarded(db, 9)
    assert deleted == [9]
    assert db.committed == 1

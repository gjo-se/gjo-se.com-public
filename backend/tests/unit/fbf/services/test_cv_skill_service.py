"""Unit tests for ``cv_skill_service`` (dedup pipeline, no DB)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.services import cv_skill_service as svc
from app.fbf.services.cv_skill_service import _dedupe_by_name

pytestmark = pytest.mark.unit


class _DB:
    def __init__(self) -> None:
        self.flushed = 0

    async def flush(self) -> None:
        self.flushed += 1


def _skill(
    sid: int,
    *,
    name: str = "Skill",
    canonical_id: int | None = None,
    group_id: int | None = None,
    vector: list[float] | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(id=sid, name=name, canonical_id=canonical_id, group_id=group_id, vector=vector)


async def test_exclude_project_skill_unknown_name_raises_value_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Excluding a name that resolves to no skill raises a ValueError."""

    async def _none(_db: Any, _name: str) -> None:
        return None

    monkeypatch.setattr(svc.skill_repository, "get_by_name", _none)

    with pytest.raises(ValueError):
        await svc.exclude_project_skill(object(), name="Unknown")


def test_dedupe_by_name_keeps_first_occurrence() -> None:
    """Duplicate names collapse to their first occurrence, order preserved."""
    assert _dedupe_by_name(["a", "b", "a", "c", "b"]) == ["a", "b", "c"]


# ── _set_skill_active ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_set_skill_active_missing_status_is_noop(monkeypatch: pytest.MonkeyPatch) -> None:
    called = False

    async def _name(_db: Any, _n: str, _t: str) -> None:
        return None

    async def _set(*_a: Any) -> None:
        nonlocal called
        called = True

    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _name)
    monkeypatch.setattr(svc.statusable_repository, "set_status", _set)

    await svc._set_skill_active(_DB(), 1)
    assert called is False


@pytest.mark.asyncio
async def test_set_skill_active_sets_when_missing_or_different(monkeypatch: pytest.MonkeyPatch) -> None:
    set_ids: list[int] = []

    async def _name(_db: Any, _n: str, _t: str) -> Any:
        return SimpleNamespace(id=7)

    async def _get(_db: Any, _t: str, _sid: int) -> Any:
        return None

    async def _set(_db: Any, _t: str, sid: int, _status_id: int) -> None:
        set_ids.append(sid)

    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _name)
    monkeypatch.setattr(svc.statusable_repository, "get_status", _get)
    monkeypatch.setattr(svc.statusable_repository, "set_status", _set)

    await svc._set_skill_active(_DB(), 3)
    assert set_ids == [3]


@pytest.mark.asyncio
async def test_set_skill_active_skips_when_already_active(monkeypatch: pytest.MonkeyPatch) -> None:
    called = False

    async def _name(_db: Any, _n: str, _t: str) -> Any:
        return SimpleNamespace(id=7)

    async def _get(_db: Any, _t: str, _sid: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="active"))

    async def _set(*_a: Any) -> None:
        nonlocal called
        called = True

    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _name)
    monkeypatch.setattr(svc.statusable_repository, "get_status", _get)
    monkeypatch.setattr(svc.statusable_repository, "set_status", _set)

    await svc._set_skill_active(_DB(), 3)
    assert called is False


# ── _effective_master ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_effective_master_uses_own_id_for_master(monkeypatch: pytest.MonkeyPatch) -> None:
    asked: list[int] = []

    async def _get(_db: Any, sid: int) -> Any:
        asked.append(sid)
        return _skill(sid)

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    await svc._effective_master(_DB(), _skill(5))
    assert asked == [5]


@pytest.mark.asyncio
async def test_effective_master_follows_canonical_id(monkeypatch: pytest.MonkeyPatch) -> None:
    asked: list[int] = []

    async def _get(_db: Any, sid: int) -> Any:
        asked.append(sid)
        return _skill(sid)

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    await svc._effective_master(_DB(), _skill(5, canonical_id=9))
    assert asked == [9]


# ── _attach_to_best_grouped_master ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_attach_returns_when_master_is_grouped(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _skill(sid, group_id=42)

    called = False

    async def _count(_db: Any, _sid: int) -> int:
        nonlocal called
        called = True
        return 0

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(svc.skill_repository, "count_slaves", _count)

    await svc._attach_to_best_grouped_master(_DB(), skill=_skill(1, vector=[1.0]))
    assert called is False


@pytest.mark.asyncio
async def test_attach_returns_without_vector(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _skill(sid)

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)

    assigned: list[Any] = []

    async def _assign(*_a: Any) -> Any:
        assigned.append(1)
        return {"updated": 1}

    monkeypatch.setattr(svc.skill_dedup_service, "assign_slave", _assign)

    await svc._attach_to_best_grouped_master(_DB(), skill=_skill(1, vector=None))
    assert assigned == []


@pytest.mark.asyncio
async def test_attach_skips_master_with_slaves(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _skill(sid)

    async def _count(_db: Any, _sid: int) -> int:
        return 2

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(svc.skill_repository, "count_slaves", _count)

    assigned: list[Any] = []

    async def _assign(*_a: Any) -> Any:
        assigned.append(1)
        return {"updated": 1}

    monkeypatch.setattr(svc.skill_dedup_service, "assign_slave", _assign)

    await svc._attach_to_best_grouped_master(_DB(), skill=_skill(1, vector=[1.0]))
    assert assigned == []


@pytest.mark.asyncio
async def test_attach_returns_when_no_grouped_master(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _skill(sid)

    async def _count(_db: Any, _sid: int) -> int:
        return 0

    async def _suggestions(*_a: Any, **_k: Any) -> list[Any]:
        return []

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(svc.skill_repository, "count_slaves", _count)
    monkeypatch.setattr(svc.skill_dedup_service, "get_suggestions", _suggestions)

    assigned: list[Any] = []

    async def _assign(*_a: Any) -> Any:
        assigned.append(1)
        return {"updated": 1}

    monkeypatch.setattr(svc.skill_dedup_service, "assign_slave", _assign)

    await svc._attach_to_best_grouped_master(_DB(), skill=_skill(1, vector=[1.0]))
    assert assigned == []


@pytest.mark.asyncio
async def test_attach_swallows_suggestion_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _skill(sid)

    async def _count(_db: Any, _sid: int) -> int:
        return 0

    async def _suggestions(*_a: Any, **_k: Any) -> list[Any]:
        raise RuntimeError("dedup down")

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(svc.skill_repository, "count_slaves", _count)
    monkeypatch.setattr(svc.skill_dedup_service, "get_suggestions", _suggestions)

    await svc._attach_to_best_grouped_master(_DB(), skill=_skill(1, vector=[1.0]))  # must not raise


@pytest.mark.asyncio
async def test_attach_skips_when_best_master_is_itself(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _skill(sid)

    async def _count(_db: Any, _sid: int) -> int:
        return 0

    async def _suggestions(*_a: Any, **_k: Any) -> list[dict[str, Any]]:
        return [{"id": 1, "similarity": 0.9}]

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(svc.skill_repository, "count_slaves", _count)
    monkeypatch.setattr(svc.skill_dedup_service, "get_suggestions", _suggestions)

    assigned: list[Any] = []

    async def _assign(*_a: Any) -> Any:
        assigned.append(1)
        return {"updated": 1}

    monkeypatch.setattr(svc.skill_dedup_service, "assign_slave", _assign)

    await svc._attach_to_best_grouped_master(_DB(), skill=_skill(1, vector=[1.0]))
    assert assigned == []


@pytest.mark.asyncio
async def test_attach_assigns_to_best_grouped_master(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _skill(sid)

    async def _count(_db: Any, _sid: int) -> int:
        return 0

    async def _suggestions(*_a: Any, **_k: Any) -> list[dict[str, Any]]:
        return [{"id": 7, "similarity": 0.88}]

    assigned: list[tuple[int, int]] = []

    async def _assign(_db: Any, skill_id: int, master_id: int) -> dict[str, int]:
        assigned.append((skill_id, master_id))
        return {"updated": 1}

    monkeypatch.setattr(svc.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(svc.skill_repository, "count_slaves", _count)
    monkeypatch.setattr(svc.skill_dedup_service, "get_suggestions", _suggestions)
    monkeypatch.setattr(svc.skill_dedup_service, "assign_slave", _assign)

    await svc._attach_to_best_grouped_master(_DB(), skill=_skill(3, vector=[1.0]))
    assert assigned == [(3, 7)]


# ── _resolve_or_create_slave ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_resolve_or_create_slave_returns_existing(monkeypatch: pytest.MonkeyPatch) -> None:
    existing = _skill(4)

    async def _by_name(_db: Any, _name: str) -> Any:
        return existing

    async def _grouped(_db: Any, _sid: int) -> Any:
        return SimpleNamespace(group_id=1)

    monkeypatch.setattr(svc.skill_repository, "get_by_name", _by_name)
    monkeypatch.setattr(svc.skill_repository, "get_by_id", _grouped)

    out = await svc._resolve_or_create_slave(_DB(), core_db=object(), name="X", embedding_client=object())
    assert out is existing


@pytest.mark.asyncio
async def test_resolve_or_create_slave_creates_and_embeds(monkeypatch: pytest.MonkeyPatch) -> None:
    created = _skill(9)
    stored: list[int] = []
    active: list[int] = []

    async def _none(_db: Any, _name: str) -> None:
        return None

    async def _create(_db: Any, *, name: str) -> Any:
        return created

    class _Client:
        async def embed_text(self, _name: str, _core: Any) -> list[float]:
            return [0.1, 0.2]

    async def _set_vector(_db: Any, sid: int, _v: Any) -> None:
        stored.append(sid)

    async def _grouped(_db: Any, _sid: int) -> Any:
        return SimpleNamespace(group_id=1)

    async def _status_name(_db: Any, _name: str, _type: str) -> Any:
        return SimpleNamespace(id=42)

    async def _no_status(_db: Any, _type: str, _sid: int) -> None:
        return None

    async def _set_status(_db: Any, _type: str, sid: int, _status_id: int) -> None:
        active.append(sid)

    monkeypatch.setattr(svc.skill_repository, "get_by_name", _none)
    monkeypatch.setattr(svc.skill_repository, "create", _create)
    monkeypatch.setattr(svc.skill_repository, "set_vector", _set_vector)
    monkeypatch.setattr(svc.skill_repository, "get_by_id", _grouped)
    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _status_name)
    monkeypatch.setattr(svc.statusable_repository, "get_status", _no_status)
    monkeypatch.setattr(svc.statusable_repository, "set_status", _set_status)

    db = _DB()
    out = await svc._resolve_or_create_slave(db, core_db=object(), name="X", embedding_client=_Client())
    assert out is created
    assert stored == [9]
    assert active == [9]
    assert db.flushed == 1


@pytest.mark.asyncio
async def test_resolve_or_create_slave_survives_embedding_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    created = _skill(9)

    async def _none(_db: Any, _name: str) -> None:
        return None

    async def _create(_db: Any, *, name: str) -> Any:
        return created

    class _Client:
        async def embed_text(self, _name: str, _core: Any) -> list[float]:
            raise RuntimeError("embed down")

    async def _grouped(_db: Any, _sid: int) -> Any:
        return SimpleNamespace(group_id=1)

    async def _status_none(_db: Any, _name: str, _type: str) -> None:
        return None

    monkeypatch.setattr(svc.skill_repository, "get_by_name", _none)
    monkeypatch.setattr(svc.skill_repository, "create", _create)
    monkeypatch.setattr(svc.skill_repository, "get_by_id", _grouped)
    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _status_none)

    out = await svc._resolve_or_create_slave(_DB(), core_db=object(), name="X", embedding_client=_Client())
    assert out is created


# ── add_project_skills / exclude_project_skill ───────────────────────────────


@pytest.mark.asyncio
async def test_add_project_skills_dedupes_strips_and_links(monkeypatch: pytest.MonkeyPatch) -> None:
    created: list[str] = []
    linked: list[tuple[int, int]] = []

    async def _none(_db: Any, _name: str) -> None:
        return None

    async def _create(_db: Any, *, name: str) -> Any:
        created.append(name)
        return _skill(100 + len(created))

    async def _grouped(_db: Any, _sid: int) -> Any:
        return SimpleNamespace(group_id=1)

    async def _status_none(_db: Any, _name: str, _type: str) -> None:
        return None

    async def _link(_db: Any, project_id: int, skill_id: int) -> Any:
        linked.append((project_id, skill_id))
        return None

    monkeypatch.setattr(svc.skill_repository, "get_by_name", _none)
    monkeypatch.setattr(svc.skill_repository, "create", _create)
    monkeypatch.setattr(svc.skill_repository, "get_by_id", _grouped)
    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _status_none)
    monkeypatch.setattr(svc.project_skill_repository, "link", _link)

    await svc.add_project_skills(
        _DB(), project_id=1, names=[" a ", "a", "  ", "b"], core_db=object(), embedding_client=object()
    )
    # Dedup happens BEFORE strip → " a " and "a" both survive; only the blank is skipped.
    assert created == ["a", "a", "b"]
    assert linked == [(1, 101), (1, 102), (1, 103)]


@pytest.mark.asyncio
async def test_exclude_project_skill_unassigns_and_rejects(monkeypatch: pytest.MonkeyPatch) -> None:
    unassigned: list[list[int]] = []
    statused: list[tuple[list[int], str]] = []

    async def _by_name(_db: Any, _name: str) -> Any:
        return _skill(8)

    async def _unassign(_db: Any, ids: list[int]) -> Any:
        unassigned.append(ids)
        return {"updated": 1}

    async def _set_status(_db: Any, ids: list[int], status: str) -> Any:
        statused.append((ids, status))
        return {"updated": 1}

    monkeypatch.setattr(svc.skill_repository, "get_by_name", _by_name)
    monkeypatch.setattr(svc.skill_dedup_service, "unassign_skills", _unassign)
    monkeypatch.setattr(svc.skill_dedup_service, "set_skills_status", _set_status)

    await svc.exclude_project_skill(_DB(), name="X")
    assert unassigned == [[8]]
    assert statused == [([8], "rejected")]

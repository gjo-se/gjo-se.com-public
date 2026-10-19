"""Unit tests for ``skill_dedup_service`` (behaviour, repository doubles, no DB).

Covers the statusable helpers, embedding loop, board page, single/bulk
mutations, dissolve, vector-similarity ranking and the bulk-action validation.
Repositories are replaced at the system boundary (``monkeypatch``); the DB
session is a minimal fake exposing only ``flush``.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import skill_dedup_service as svc
from app.fbf.services.skill_dedup_service import (
    _ensure_skill_status,
    _get_skill_status,
    _set_skill_status,
)

pytestmark = pytest.mark.unit


# ── fakes ────────────────────────────────────────────────────────────────────
class _DB:
    """Minimal fake DB session – the tests only ever touch ``flush``."""

    def __init__(self) -> None:
        self.flush_count = 0

    async def flush(self) -> None:
        self.flush_count += 1


def _sr(
    sid: int,
    *,
    name: str = "skill",
    canonical_id: int | None = None,
    vector: list[float] | None = None,
    importance: int | None = None,
    level: int | None = None,
    level_public: int | None = None,
    description: str | None = None,
) -> SkillRef:
    """Build an in-memory ``SkillRef`` DTO."""
    return SkillRef(
        id=sid,
        name=name,
        description=description,
        importance=importance,
        level=level,
        level_public=level_public,
        canonical_id=canonical_id,
        group_id=None,
        sort=None,
        vector=vector,
    )


def _status_entry(name: str) -> SimpleNamespace:
    """Fake ``StatusableEntry`` whose ``.status.name`` matches the DB status."""
    return SimpleNamespace(status=SimpleNamespace(name=name))


def _patch(monkeypatch: pytest.MonkeyPatch, **fns: Any) -> None:
    """Patch the module's ``skill_repository`` functions in one call."""
    for name, fn in fns.items():
        monkeypatch.setattr(svc.skill_repository, name, fn)


def _patch_status(monkeypatch: pytest.MonkeyPatch, **fns: Any) -> None:
    for name, fn in fns.items():
        monkeypatch.setattr(svc.statusable_repository, name, fn)


def _by_ids(items: dict[int, SkillRef]) -> Any:
    async def _load(_db: Any, ids: list[int]) -> list[SkillRef]:
        return [items[i] for i in ids]

    return _load


def _patch_status_boundary(
    monkeypatch: pytest.MonkeyPatch,
    *,
    current: Any = None,
    set_calls: list[tuple[int, int]] | None = None,
) -> None:
    """Fake the status boundary so the real ``_ensure_skill_status`` runs."""

    async def _get(_db: Any, _t: str, sid: int) -> Any:
        name = current(sid) if callable(current) else current
        return None if name is None else _status_entry(name)

    async def _resolve(_db: Any, _name: str, _type: str) -> Any:
        return SimpleNamespace(id=42)

    async def _set(_db: Any, _t: str, sid: int, status_id: int) -> None:
        if set_calls is not None:
            set_calls.append((sid, status_id))

    _patch_status(monkeypatch, get_status=_get, set_status=_set)
    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _resolve)


# ── statusable helpers ───────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_skill_status_defaults_to_pending_without_entry(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _t: str, _sid: int) -> None:
        return None

    _patch_status(monkeypatch, get_status=_none)
    assert await _get_skill_status(_DB(), 1) == "pending"


@pytest.mark.asyncio
async def test_get_skill_status_returns_entry_status_name(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _entry(_db: Any, _t: str, _sid: int) -> Any:
        return _status_entry("active")

    _patch_status(monkeypatch, get_status=_entry)
    assert await _get_skill_status(_DB(), 1) == "active"


@pytest.mark.asyncio
async def test_set_skill_status_applies_when_status_resolves(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, int, int]] = []

    async def _name(_db: Any, _name: str, _type: str) -> Any:
        return SimpleNamespace(id=42)

    async def _set(_db: Any, _t: str, sid: int, status_id: int) -> None:
        calls.append((_t, sid, status_id))

    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _name)
    _patch_status(monkeypatch, set_status=_set)

    await _set_skill_status(_DB(), 7, "active")
    assert calls == [("fbf_skill", 7, 42)]


@pytest.mark.asyncio
async def test_set_skill_status_is_noop_for_unknown_status(monkeypatch: pytest.MonkeyPatch) -> None:
    called = False

    async def _name(_db: Any, _name: str, _type: str) -> None:
        return None

    async def _set(_db: Any, *_a: Any) -> None:
        nonlocal called
        called = True

    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _name)
    _patch_status(monkeypatch, set_status=_set)

    await _set_skill_status(_DB(), 7, "nope")
    assert called is False


@pytest.mark.asyncio
async def test_ensure_skill_status_returns_true_and_sets_on_diff(monkeypatch: pytest.MonkeyPatch) -> None:
    set_calls: list[tuple[int, int]] = []
    _patch_status_boundary(monkeypatch, current="pending", set_calls=set_calls)

    assert await _ensure_skill_status(_DB(), 1, "active") is True
    assert set_calls == [(1, 42)]


@pytest.mark.asyncio
async def test_ensure_skill_status_returns_false_when_equal(monkeypatch: pytest.MonkeyPatch) -> None:
    set_calls: list[tuple[int, int]] = []
    _patch_status_boundary(monkeypatch, current="active", set_calls=set_calls)

    assert await _ensure_skill_status(_DB(), 1, "active") is False
    assert set_calls == []


# ── compute_embeddings ───────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_compute_embeddings_no_work_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any) -> list[SkillRef]:
        return []

    _patch(monkeypatch, get_skills_without_vector=_none)
    db = _DB()
    assert await svc.compute_embeddings(db, db, embedding_client=SimpleNamespace()) == 0


@pytest.mark.asyncio
async def test_compute_embeddings_batch_success_counts_all(monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [_sr(1, name="a"), _sr(2, name="b")]
    stored: list[tuple[int, list[float]]] = []

    async def _missing(_db: Any) -> list[SkillRef]:
        return skills

    async def _set_vector(_db: Any, sid: int, vector: list[float]) -> None:
        stored.append((sid, vector))

    class _Client:
        async def embed_many(self, texts: list[str], _core: Any) -> list[list[float]]:
            return [[float(i)] for i in range(len(texts))]

    _patch(monkeypatch, get_skills_without_vector=_missing, set_vector=_set_vector)
    db = _DB()
    count = await svc.compute_embeddings(db, db, embedding_client=_Client())
    assert count == 2
    assert [sid for sid, _ in stored] == [1, 2]
    assert db.flush_count == 1


@pytest.mark.asyncio
async def test_compute_embeddings_falls_back_to_single_on_batch_error(monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [_sr(1, name="a"), _sr(2, name="b")]
    stored: list[int] = []

    async def _missing(_db: Any) -> list[SkillRef]:
        return skills

    async def _set_vector(_db: Any, sid: int, _vector: list[float]) -> None:
        stored.append(sid)

    class _Client:
        async def embed_many(self, _texts: list[str], _core: Any) -> list[list[float]]:
            raise RuntimeError("batch down")

        async def embed_text(self, text: str, _core: Any) -> list[float]:
            if text == "b":
                raise RuntimeError("still down")
            return [1.0]

    _patch(monkeypatch, get_skills_without_vector=_missing, set_vector=_set_vector)
    db = _DB()
    count = await svc.compute_embeddings(db, db, embedding_client=_Client())
    assert count == 1
    assert stored == [1]


# ── board page ───────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_board_page_resolves_master_name_and_progress(monkeypatch: pytest.MonkeyPatch) -> None:
    slave = _sr(2, name="slave", canonical_id=1)
    master = _sr(1, name="master")

    async def _page(_db: Any, **_kw: Any) -> tuple[list[tuple[SkillRef, int]], int]:
        return [(slave, 0)], 1

    async def _by_ids(_db: Any, ids: list[int]) -> list[SkillRef]:
        return [master] if ids == [1] else []

    async def _count(_db: Any, *, active_only: bool = False) -> int:
        return 5 if active_only else 9

    async def _status(_db: Any, _t: str, _sid: int) -> Any:
        return _status_entry("active")

    _patch(monkeypatch, get_board_page=_page, get_by_ids=_by_ids, count_masters=_count)
    _patch_status(monkeypatch, get_status=_status)

    out = await svc.get_board_page(_DB(), column="slaves")
    assert out["items"][0]["master_name"] == "master"
    assert out["items"][0]["status"] == "active"
    assert out["checked_masters"] == 5
    assert out["total_masters"] == 9


@pytest.mark.asyncio
async def test_get_board_page_skips_master_lookup_without_canonical_ids(monkeypatch: pytest.MonkeyPatch) -> None:
    standalone = _sr(3, name="solo")

    async def _page(_db: Any, **_kw: Any) -> tuple[list[tuple[SkillRef, int]], int]:
        return [(standalone, 2)], 1

    async def _boom(_db: Any, _ids: list[int]) -> list[SkillRef]:
        raise AssertionError("get_by_ids must not be called without canonical ids")

    async def _count(_db: Any, *, active_only: bool = False) -> int:
        return 0

    async def _status(_db: Any, _t: str, _sid: int) -> None:
        return None

    _patch(monkeypatch, get_board_page=_page, get_by_ids=_boom, count_masters=_count)
    _patch_status(monkeypatch, get_status=_status)

    out = await svc.get_board_page(_DB(), column="masters")
    assert out["items"][0]["master_name"] is None
    assert out["items"][0]["alias_count"] == 2


# ── assign_slave ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_assign_slave_missing_skill_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _sid: int) -> None:
        return None

    _patch(monkeypatch, get_by_id=_none)
    with pytest.raises(ValueError, match="not found"):
        await svc.assign_slave(_DB(), 1, 2)


@pytest.mark.asyncio
async def test_assign_slave_missing_master_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _sr(sid) if sid == 1 else None

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="Master skill"):
        await svc.assign_slave(_DB(), 1, 2)


@pytest.mark.asyncio
async def test_assign_slave_to_itself_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _sr(sid)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="itself"):
        await svc.assign_slave(_DB(), 5, 5)


@pytest.mark.asyncio
async def test_assign_slave_master_is_slave_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _sr(sid, canonical_id=99) if sid == 2 else _sr(sid)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="not a master"):
        await svc.assign_slave(_DB(), 1, 2)


@pytest.mark.asyncio
async def test_assign_slave_success_sets_canonical_and_status(monkeypatch: pytest.MonkeyPatch) -> None:
    assigned: list[tuple[int, int | None]] = []
    statuses: list[str] = []

    async def _get(_db: Any, sid: int) -> Any:
        return _sr(sid)

    async def _set_canonical(_db: Any, sid: int, master_id: int | None) -> None:
        assigned.append((sid, master_id))

    async def _name(_db: Any, _name: str, _type: str) -> Any:
        return SimpleNamespace(id=7)

    async def _set_status(_db: Any, _t: str, _sid: int, _status_id: int) -> None:
        statuses.append(_t)

    async def _get_status(_db: Any, _t: str, _sid: int) -> Any:
        return _status_entry("pending")

    _patch(monkeypatch, get_by_id=_get, set_canonical_id=_set_canonical)
    monkeypatch.setattr(svc.status_repository, "get_by_name_for_type", _name)
    _patch_status(monkeypatch, set_status=_set_status, get_status=_get_status)

    db = _DB()
    out = await svc.assign_slave(db, 1, 2)
    assert out == {"updated": 1}
    assert assigned == [(1, 2)]
    assert db.flush_count == 1


# ── activate_master ──────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_activate_master_missing_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _mid: int) -> None:
        return None

    _patch(monkeypatch, get_by_id=_none)
    with pytest.raises(ValueError, match="not found"):
        await svc.activate_master(_DB(), 1, [])


@pytest.mark.asyncio
async def test_activate_master_rejects_unassigned_slave(monkeypatch: pytest.MonkeyPatch) -> None:
    master = _sr(1)
    stranger = _sr(2, canonical_id=999)

    async def _get(_db: Any, sid: int) -> Any:
        return master if sid == 1 else stranger

    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return [stranger]

    _patch(monkeypatch, get_by_id=_get, get_by_ids=_by_ids)
    _patch_status_boundary(monkeypatch, current="pending")
    with pytest.raises(ValueError, match="not assigned"):
        await svc.activate_master(_DB(), 1, [2])


@pytest.mark.asyncio
async def test_activate_master_success_counts_changes(monkeypatch: pytest.MonkeyPatch) -> None:
    master = _sr(1)
    slave = _sr(2, canonical_id=1)

    async def _get(_db: Any, sid: int) -> Any:
        return master if sid == 1 else slave

    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return [slave]

    _patch(monkeypatch, get_by_id=_get, get_by_ids=_by_ids)
    _patch_status_boundary(monkeypatch, current="pending")

    db = _DB()
    assert await svc.activate_master(db, 1, [2]) == {"updated": 2}
    assert db.flush_count == 1


# ── archive / set-status / unassign ──────────────────────────────────────────
@pytest.mark.asyncio
async def test_archive_skills_deprecates_and_detaches(monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [_sr(1, canonical_id=9), _sr(2)]
    detached: list[int] = []

    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return skills

    async def _set_canonical(_db: Any, sid: int, _mid: int | None) -> None:
        detached.append(sid)

    _patch(monkeypatch, get_by_ids=_by_ids, set_canonical_id=_set_canonical)
    _patch_status_boundary(monkeypatch, current="active")

    out = await svc.archive_skills(_DB(), [1, 2])
    assert out == {"updated": 2}
    assert detached == [1]


@pytest.mark.asyncio
async def test_set_skills_status_counts_only_changes(monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [_sr(1), _sr(2)]

    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return skills

    _patch(monkeypatch, get_by_ids=_by_ids)
    _patch_status_boundary(monkeypatch, current=lambda sid: "rejected" if sid == 2 else "pending")

    assert await svc.set_skills_status(_DB(), [1, 2], "rejected") == {"updated": 1}


@pytest.mark.asyncio
async def test_unassign_skills_only_touches_assigned(monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [_sr(1, canonical_id=9), _sr(2)]
    detached: list[int] = []

    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return skills

    async def _set_canonical(_db: Any, sid: int, _mid: int | None) -> None:
        detached.append(sid)

    _patch(monkeypatch, get_by_ids=_by_ids, set_canonical_id=_set_canonical)
    _patch_status_boundary(monkeypatch, current="active")

    assert await svc.unassign_skills(_DB(), [1, 2]) == {"updated": 1}
    assert detached == [1]


# ── bulk_action ──────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_bulk_action_rejects_empty_ids() -> None:
    with pytest.raises(ValueError, match="at least one"):
        await svc.bulk_action(_DB(), action="pending", skill_ids=[])


@pytest.mark.asyncio
async def test_bulk_action_assign_delegates_and_sums_updated(monkeypatch: pytest.MonkeyPatch) -> None:
    assigned: list[tuple[int, int]] = []

    async def _by_ids(_db: Any, ids: list[int]) -> list[SkillRef]:
        return [_sr(i) for i in ids]

    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid)

    async def _assign(_db: Any, *, skill_id: int, master_id: int) -> dict[str, int]:
        assigned.append((skill_id, master_id))
        return {"updated": 1}

    _patch(monkeypatch, get_by_ids=_by_ids, get_by_id=_get)
    monkeypatch.setattr(svc, "assign_slave", _assign)

    out = await svc.bulk_action(_DB(), action="assign", skill_ids=[2, 3], master_id=1)
    assert out == {"updated": 2}
    assert assigned == [(2, 1), (3, 1)]


@pytest.mark.asyncio
async def test_bulk_action_activate_delegates(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _by_ids(_db: Any, ids: list[int]) -> list[SkillRef]:
        return [_sr(i, canonical_id=1) for i in ids]

    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid)

    async def _activate(_db: Any, *, master_id: int, slave_ids: list[int]) -> dict[str, int]:
        return {"updated": 3}

    _patch(monkeypatch, get_by_ids=_by_ids, get_by_id=_get)
    monkeypatch.setattr(svc, "activate_master", _activate)

    out = await svc.bulk_action(_DB(), action="activate", skill_ids=[2], master_id=1)
    assert out == {"updated": 3}


@pytest.mark.asyncio
async def test_bulk_action_status_maps_to_set_status(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _by_ids(_db: Any, ids: list[int]) -> list[SkillRef]:
        return [_sr(i) for i in ids]

    async def _set(_db: Any, *, skill_ids: list[int], status: str) -> dict[str, int]:
        return {"updated": len(skill_ids)}

    _patch(monkeypatch, get_by_ids=_by_ids)
    monkeypatch.setattr(svc, "set_skills_status", _set)

    assert await svc.bulk_action(_DB(), action="rejected", skill_ids=[1, 2]) == {"updated": 2}


# ── _validate_bulk_action ────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_validate_bulk_action_assign_requires_master_id() -> None:
    with pytest.raises(ValueError, match="master_id is required"):
        await svc._validate_bulk_action(_DB(), "assign", [], [], None)


@pytest.mark.asyncio
async def test_validate_bulk_action_activate_requires_master_id() -> None:
    with pytest.raises(ValueError, match="master_id is required"):
        await svc._validate_bulk_action(_DB(), "activate", [], [], None)


@pytest.mark.asyncio
async def test_validate_bulk_action_assign_master_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _mid: int) -> None:
        return None

    _patch(monkeypatch, get_by_id=_none)
    with pytest.raises(ValueError, match="Master skill"):
        await svc._validate_bulk_action(_DB(), "assign", [], [], 1)


@pytest.mark.asyncio
async def test_validate_bulk_action_assign_master_is_slave(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid, canonical_id=3)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="not a master"):
        await svc._validate_bulk_action(_DB(), "assign", [], [], 1)


@pytest.mark.asyncio
async def test_validate_bulk_action_assign_rejects_self_in_list(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="itself"):
        await svc._validate_bulk_action(_DB(), "assign", [_sr(1)], [1], 1)


@pytest.mark.asyncio
async def test_validate_bulk_action_activate_rejects_unassigned(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="not assigned"):
        await svc._validate_bulk_action(_DB(), "activate", [_sr(2, canonical_id=9)], [2], 1)


@pytest.mark.asyncio
async def test_validate_bulk_action_activate_accepts_master_and_slaves(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid)

    _patch(monkeypatch, get_by_id=_get)
    # master itself (id == master_id) and an assigned slave are both valid
    await svc._validate_bulk_action(_DB(), "activate", [_sr(1), _sr(2, canonical_id=1)], [1, 2], 1)


@pytest.mark.asyncio
async def test_validate_bulk_action_unknown_action_raises() -> None:
    with pytest.raises(ValueError, match="Unknown action"):
        await svc._validate_bulk_action(_DB(), "bogus", [], [], None)


# ── dissolve_group ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_dissolve_group_missing_master_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _mid: int) -> None:
        return None

    _patch(monkeypatch, get_by_id=_none)
    with pytest.raises(ValueError, match="not found"):
        await svc.dissolve_group(_DB(), 1)


@pytest.mark.asyncio
async def test_dissolve_group_rejects_non_master(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid, canonical_id=5)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="not a master"):
        await svc.dissolve_group(_DB(), 1)


@pytest.mark.asyncio
async def test_dissolve_group_frees_slaves_and_master(monkeypatch: pytest.MonkeyPatch) -> None:
    slaves = [_sr(2, canonical_id=1), _sr(3, canonical_id=1)]
    detached: list[int] = []

    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid)

    async def _slaves(_db: Any, _mid: int) -> list[SkillRef]:
        return slaves

    async def _set_canonical(_db: Any, sid: int, _mid: int | None) -> None:
        detached.append(sid)

    _patch(monkeypatch, get_by_id=_get, get_slaves=_slaves, set_canonical_id=_set_canonical)
    _patch_status_boundary(monkeypatch, current="active")

    out = await svc.dissolve_group(_DB(), 1)
    assert detached == [2, 3]
    assert out == {"updated": 3}  # 2 slaves + master


# ── get_candidates ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_candidates_missing_master_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _mid: int) -> None:
        return None

    _patch(monkeypatch, get_by_id=_none)
    with pytest.raises(ValueError, match="not found"):
        await svc.get_candidates(_DB(), 1)


@pytest.mark.asyncio
async def test_get_candidates_master_without_vector_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, mid: int) -> Any:
        return _sr(mid, vector=None)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="no embedding vector"):
        await svc.get_candidates(_DB(), 1)


@pytest.mark.asyncio
async def test_get_candidates_excludes_self_and_sorts_desc(monkeypatch: pytest.MonkeyPatch) -> None:
    master = _sr(1, vector=[1.0, 0.0])
    cands = [
        _sr(1, vector=[1.0, 0.0]),  # self → excluded
        _sr(2, vector=[0.9, 0.1]),  # close
        _sr(3, vector=[0.0, 1.0]),  # far
    ]

    async def _get(_db: Any, mid: int) -> Any:
        return master

    async def _vectors(_db: Any, *, canonical_id_is_none: bool) -> list[SkillRef]:
        return cands

    async def _status(_db: Any, _t: str, _sid: int) -> Any:
        return _status_entry("pending")

    _patch(monkeypatch, get_by_id=_get, get_skills_with_vectors=_vectors)
    _patch_status(monkeypatch, get_status=_status)

    out = await svc.get_candidates(_DB(), 1)
    assert [item["id"] for item in out] == [2, 3]
    assert out[0]["similarity"] > out[1]["similarity"]


# ── get_suggestions ──────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_suggestions_missing_slave_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _sid: int) -> None:
        return None

    _patch(monkeypatch, get_by_id=_none)
    with pytest.raises(ValueError, match="not found"):
        await svc.get_suggestions(_DB(), 1)


@pytest.mark.asyncio
async def test_get_suggestions_without_vector_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> Any:
        return _sr(sid, vector=None)

    _patch(monkeypatch, get_by_id=_get)
    with pytest.raises(ValueError, match="no embedding vector"):
        await svc.get_suggestions(_DB(), 1)


@pytest.mark.asyncio
async def test_get_suggestions_passes_require_group_and_excludes_self(monkeypatch: pytest.MonkeyPatch) -> None:
    slave = _sr(5, vector=[1.0, 0.0])
    seen: dict[str, Any] = {}

    async def _get(_db: Any, sid: int) -> Any:
        return slave

    async def _vectors(_db: Any, *, canonical_id_is_none: bool, require_group: bool) -> list[SkillRef]:
        seen["require_group"] = require_group
        return [_sr(5, vector=[1.0, 0.0]), _sr(6, vector=[0.5, 0.5])]

    async def _status(_db: Any, _t: str, _sid: int) -> Any:
        return _status_entry("active")

    _patch(monkeypatch, get_by_id=_get, get_skills_with_vectors=_vectors)
    _patch_status(monkeypatch, get_status=_status)

    out = await svc.get_suggestions(_DB(), 5, require_group=True)
    assert seen["require_group"] is True
    assert [item["id"] for item in out] == [6]


# ── get_similar_masters ──────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_similar_masters_missing_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return []

    _patch(monkeypatch, get_by_ids=_none)
    with pytest.raises(ValueError, match="Skills not found"):
        await svc.get_similar_masters(_DB(), skill_ids=[1])


@pytest.mark.asyncio
async def test_get_similar_masters_without_vector_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return [_sr(1, vector=None)]

    _patch(monkeypatch, get_by_ids=_by_ids)
    with pytest.raises(ValueError, match="no embedding vector"):
        await svc.get_similar_masters(_DB(), skill_ids=[1])


@pytest.mark.asyncio
async def test_get_similar_masters_group_uses_best_member_score(monkeypatch: pytest.MonkeyPatch) -> None:
    reference = _sr(1, vector=[1.0, 0.0])

    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return [reference]

    # master 2 (weak own score) with a very close slave → group score = slave score
    candidates = [(_sr(2, vector=[0.1, 0.9]), 1), (_sr(3, vector=[0.8, 0.2]), 0)]
    slave = _sr(9, canonical_id=2, vector=[1.0, 0.0])

    async def _page(_db: Any, **_kw: Any) -> tuple[list[tuple[SkillRef, int]], int]:
        return candidates, 2

    async def _slaves(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return [slave]

    async def _status(_db: Any, _t: str, _sid: int) -> Any:
        return _status_entry("active")

    _patch(monkeypatch, get_by_ids=_by_ids, get_board_page=_page, get_slaves_with_vectors=_slaves)
    _patch_status(monkeypatch, get_status=_status)

    out = await svc.get_similar_masters(_DB(), skill_ids=[1])
    by_id = {item["id"]: item for item in out}
    assert by_id[2]["best_member_name"] == "skill"
    assert by_id[2]["similarity"] == pytest.approx(1.0)
    # group 2 (0.1) outranks standalone 3 (0.8) after refinement
    assert out[0]["id"] == 2

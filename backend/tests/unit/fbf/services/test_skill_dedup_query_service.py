"""Unit tests for the skill-dedup read-side service (repository doubles, no DB).

Board, candidate and suggestion ranking are exercised against doubled skill
repositories; the status lookup is doubled as well. No database is touched.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import skill_dedup_query_service as qs

pytestmark = pytest.mark.unit


class _DB:
    """Minimal async-session stand-in (only passed through to the doubles)."""


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
    return SimpleNamespace(status=SimpleNamespace(name=name))


# ── get_board_page ───────────────────────────────────────────────────────────


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

    monkeypatch.setattr(qs.skill_repository, "get_board_page", _page)
    monkeypatch.setattr(qs.skill_repository, "get_by_ids", _by_ids)
    monkeypatch.setattr(qs.skill_repository, "count_masters", _count)
    monkeypatch.setattr(qs.statusable_repository, "get_status", _status)

    out = await qs.get_board_page(_DB(), column="slaves")

    assert out["items"][0]["master_name"] == "master"
    assert out["items"][0]["status"] == "active"
    assert out["checked_masters"] == 5
    assert out["total_masters"] == 9
    assert out["total"] == 1


@pytest.mark.asyncio
async def test_get_board_page_skips_master_lookup_without_canonical_ids(monkeypatch: pytest.MonkeyPatch) -> None:
    standalone = _sr(3, name="solo")

    async def _page(_db: Any, **_kw: Any) -> tuple[list[tuple[SkillRef, int]], int]:
        return [(standalone, 2)], 1

    async def _boom(_db: Any, _ids: list[int]) -> list[SkillRef]:
        raise AssertionError("get_by_ids must not run without canonical ids")

    async def _count(_db: Any, *, active_only: bool = False) -> int:
        return 0

    async def _status(_db: Any, _t: str, _sid: int) -> None:
        return None

    monkeypatch.setattr(qs.skill_repository, "get_board_page", _page)
    monkeypatch.setattr(qs.skill_repository, "get_by_ids", _boom)
    monkeypatch.setattr(qs.skill_repository, "count_masters", _count)
    monkeypatch.setattr(qs.statusable_repository, "get_status", _status)

    out = await qs.get_board_page(_DB(), column="masters")

    assert out["items"][0]["master_name"] is None
    assert out["items"][0]["alias_count"] == 2
    assert out["items"][0]["status"] == "pending"  # no status entry → default


# ── get_candidates ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_candidates_missing_master_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _sid: int) -> None:
        return None

    monkeypatch.setattr(qs.skill_repository, "get_by_id", _none)

    with pytest.raises(ValueError, match="not found"):
        await qs.get_candidates(_DB(), 1)


@pytest.mark.asyncio
async def test_get_candidates_master_without_vector_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> SkillRef:
        return _sr(sid, vector=None)

    monkeypatch.setattr(qs.skill_repository, "get_by_id", _get)

    with pytest.raises(ValueError, match="no embedding vector"):
        await qs.get_candidates(_DB(), 1)


@pytest.mark.asyncio
async def test_get_candidates_excludes_self_and_sorts_desc(monkeypatch: pytest.MonkeyPatch) -> None:
    master = _sr(1, vector=[1.0, 0.0])
    cands = [
        _sr(1, vector=[1.0, 0.0]),  # self → excluded
        _sr(2, vector=[0.9, 0.1]),  # close
        _sr(3, vector=[0.0, 1.0]),  # far
    ]

    async def _get(_db: Any, _sid: int) -> SkillRef:
        return master

    async def _vectors(_db: Any, *, canonical_id_is_none: bool) -> list[SkillRef]:
        return cands

    async def _status(_db: Any, _type: str, _sid: int) -> Any:
        return _status_entry("pending")

    monkeypatch.setattr(qs.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(qs.skill_repository, "get_skills_with_vectors", _vectors)
    monkeypatch.setattr(qs.statusable_repository, "get_status", _status)

    out = await qs.get_candidates(_DB(), 1)

    assert [item["id"] for item in out] == [2, 3]
    assert out[0]["similarity"] > out[1]["similarity"]
    assert out[0]["status"] == "pending"


# ── get_suggestions ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_suggestions_missing_slave_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _sid: int) -> None:
        return None

    monkeypatch.setattr(qs.skill_repository, "get_by_id", _none)

    with pytest.raises(ValueError, match="not found"):
        await qs.get_suggestions(_DB(), 1)


@pytest.mark.asyncio
async def test_get_suggestions_without_vector_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get(_db: Any, sid: int) -> SkillRef:
        return _sr(sid, vector=None)

    monkeypatch.setattr(qs.skill_repository, "get_by_id", _get)

    with pytest.raises(ValueError, match="no embedding vector"):
        await qs.get_suggestions(_DB(), 1)


@pytest.mark.asyncio
async def test_get_suggestions_passes_require_group_and_excludes_self(monkeypatch: pytest.MonkeyPatch) -> None:
    slave = _sr(5, vector=[1.0, 0.0])
    seen: dict[str, Any] = {}

    async def _get(_db: Any, _sid: int) -> SkillRef:
        return slave

    async def _vectors(_db: Any, *, canonical_id_is_none: bool, require_group: bool) -> list[SkillRef]:
        seen["require_group"] = require_group
        return [_sr(5, vector=[1.0, 0.0]), _sr(6, vector=[0.5, 0.5])]

    async def _status(_db: Any, _type: str, _sid: int) -> Any:
        return _status_entry("active")

    monkeypatch.setattr(qs.skill_repository, "get_by_id", _get)
    monkeypatch.setattr(qs.skill_repository, "get_skills_with_vectors", _vectors)
    monkeypatch.setattr(qs.statusable_repository, "get_status", _status)

    out = await qs.get_suggestions(_DB(), 5, require_group=True)

    assert seen["require_group"] is True
    assert [item["id"] for item in out] == [6]


# ── get_similar_masters ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_similar_masters_missing_reference_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return []

    monkeypatch.setattr(qs.skill_repository, "get_by_ids", _none)

    with pytest.raises(ValueError, match="Skills not found"):
        await qs.get_similar_masters(_DB(), skill_ids=[1])


@pytest.mark.asyncio
async def test_get_similar_masters_without_vector_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _by_ids(_db: Any, _ids: list[int]) -> list[SkillRef]:
        return [_sr(1, vector=None)]

    monkeypatch.setattr(qs.skill_repository, "get_by_ids", _by_ids)

    with pytest.raises(ValueError, match="no embedding vector"):
        await qs.get_similar_masters(_DB(), skill_ids=[1])


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

    async def _status(_db: Any, _type: str, _sid: int) -> Any:
        return _status_entry("active")

    monkeypatch.setattr(qs.skill_repository, "get_by_ids", _by_ids)
    monkeypatch.setattr(qs.skill_repository, "get_board_page", _page)
    monkeypatch.setattr(qs.skill_repository, "get_slaves_with_vectors", _slaves)
    monkeypatch.setattr(qs.statusable_repository, "get_status", _status)

    out = await qs.get_similar_masters(_DB(), skill_ids=[1])

    by_id = {item["id"]: item for item in out}
    assert by_id[2]["best_member_name"] == "skill"
    assert by_id[2]["best_member_similarity"] == pytest.approx(1.0)
    # group 2 (0.1) outranks the standalone master 3 (0.8) after refinement
    assert out[0]["id"] == 2

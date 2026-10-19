"""Unit tests for the description-merge prompt builders (pure, no DB/LLM).

The service maps registry placeholders to project data by prefix convention.
These helpers build the slave block and the prompt variable dict; they carry no
DB or LLM dependency.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.repositories import project_repository as pr
from app.fbf.services import description_merge_service as svc
from app.fbf.services.description_merge_service import (
    DescriptionMergeService,
    _build_variables,
    _join_slave_descriptions,
)

pytestmark = pytest.mark.unit


def _slave(title: str | None, description: str | None) -> SimpleNamespace:
    """Build a minimal slave-like object for the prompt builders."""
    return SimpleNamespace(title=title, description=description)


def test_join_slave_descriptions_prefixes_title_and_skips_empty() -> None:
    """Each described slave is titled; slaves without a description are skipped."""
    slaves = [_slave("Role A", "Desc A"), _slave("Role B", None), _slave(None, "Desc C")]

    joined = _join_slave_descriptions(slaves)

    assert joined == "**Role A**\n\nDesc A\n\n---\n\nDesc C"


def test_join_slave_descriptions_returns_empty_for_no_content() -> None:
    """No described slaves yields an empty block."""
    assert _join_slave_descriptions([_slave("Role A", None)]) == ""


def test_build_variables_counts_only_slaves_with_description() -> None:
    """``slave_count`` counts only slaves that actually carry a description."""
    master = SimpleNamespace(title="Master", description="Master desc")
    slaves = [_slave("A", "A desc"), _slave("B", None), _slave("C", "C desc")]

    variables = _build_variables(master, slaves)

    assert variables["slave_count"] == "2"
    assert variables["slave_descriptions"] == _join_slave_descriptions(slaves)


def test_build_variables_maps_master_fields_and_covers_every_placeholder() -> None:
    """``master_*`` keys resolve to master fields; every placeholder is present."""
    master = SimpleNamespace(title="Master Title", description="Master Desc")

    variables = _build_variables(master, [])

    assert variables["master_title"] == "Master Title"
    assert variables["master_description"] == "Master Desc"
    assert variables["slave_count"] == "0"


# ── service methods (fake repository + executor + client) ────────────────────


class _DB:
    def __init__(self) -> None:
        self.committed = 0

    async def commit(self) -> None:
        self.committed += 1


def _master_obj() -> SimpleNamespace:
    return SimpleNamespace(title="Master", description="Master desc")


def _slave_obj(desc: str | None, similarity: float | None, title: str = "S") -> SimpleNamespace:
    return SimpleNamespace(title=title, description=desc, similarity_score=similarity)


def _patch_repo(monkeypatch: pytest.MonkeyPatch, **fns: Any) -> None:
    for name, fn in fns.items():
        monkeypatch.setattr(pr, name, fn)


@pytest.mark.asyncio
async def test_merge_group_missing_master_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _pid: int) -> None:
        return None

    _patch_repo(monkeypatch, get_out_by_id=_none)
    with pytest.raises(ValueError, match="not found"):
        await DescriptionMergeService(lambda _m: None).merge_group(_DB(), object(), 1)


@pytest.mark.asyncio
async def test_merge_group_success_persists_and_commits(monkeypatch: pytest.MonkeyPatch) -> None:
    saved: dict[str, Any] = {}

    async def _get_master(_db: Any, _pid: int) -> Any:
        return _master_obj()

    async def _get_slaves(_db: Any, _pid: int) -> list[Any]:
        return [_slave_obj("d1", 0.2), _slave_obj(None, 0.9)]

    async def _set(_db: Any, pid: int, **kw: Any) -> None:
        saved["pid"] = pid
        saved.update(kw)

    class _Exec:
        async def execute_task(self, **_kw: Any) -> dict[str, Any]:
            return {"success": True, "result": "MERGED"}

    _patch_repo(monkeypatch, get_out_by_id=_get_master, get_slaves_out=_get_slaves, set_merged_fields=_set)
    monkeypatch.setattr(svc, "get_task_executor_service", _Exec)

    db = _DB()
    out = await DescriptionMergeService(lambda _m: None).merge_group(db, object(), 7)
    assert out == "MERGED"
    assert saved["pid"] == 7
    assert saved["merged_description_de"] == "MERGED"
    assert db.committed == 1


@pytest.mark.asyncio
async def test_merge_group_executor_failure_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _get_master(_db: Any, _pid: int) -> Any:
        return _master_obj()

    async def _get_slaves(_db: Any, _pid: int) -> list[Any]:
        return []

    class _Exec:
        async def execute_task(self, **_kw: Any) -> dict[str, Any]:
            return {"success": False, "error_type": "boom"}

    _patch_repo(monkeypatch, get_out_by_id=_get_master, get_slaves_out=_get_slaves)
    monkeypatch.setattr(svc, "get_task_executor_service", _Exec)

    with pytest.raises(RuntimeError, match="boom"):
        await DescriptionMergeService(lambda _m: None).merge_group(_DB(), object(), 7)


@pytest.mark.asyncio
async def test_resolve_group_preflights_via_client(monkeypatch: pytest.MonkeyPatch) -> None:
    resolved: dict[str, Any] = {}

    async def _get_master(_db: Any, _pid: int) -> Any:
        return _master_obj()

    async def _get_slaves(_db: Any, _pid: int) -> list[Any]:
        return [_slave_obj("d1", 0.5)]

    class _Client:
        async def resolve(self, **kw: Any) -> None:
            resolved.update(kw)

    _patch_repo(monkeypatch, get_out_by_id=_get_master, get_slaves_out=_get_slaves)

    await DescriptionMergeService(lambda _m: _Client()).resolve_group(_DB(), object(), 7)
    assert resolved["task"] == "description-merge"
    assert resolved["project_id"] == 7


@pytest.mark.asyncio
async def test_merge_group_stream_yields_meta_and_chunks(monkeypatch: pytest.MonkeyPatch) -> None:
    saved: dict[str, Any] = {}

    async def _get_master(_db: Any, _pid: int) -> Any:
        return _master_obj()

    async def _get_slaves(_db: Any, _pid: int) -> list[Any]:
        return [_slave_obj("d1", 0.5)]

    async def _set(_db: Any, _pid: int, **kw: Any) -> None:
        saved.update(kw)

    class _Client:
        _call_log_id = 99

        async def call_text_stream(self, **_kw: Any) -> Any:
            for chunk in ("Hel", "lo"):
                yield chunk

    _patch_repo(monkeypatch, get_out_by_id=_get_master, get_slaves_out=_get_slaves, set_merged_fields=_set)

    db = _DB()
    chunks = [c async for c in DescriptionMergeService(lambda _m: _Client()).merge_group_stream(db, object(), 7)]
    assert chunks[0].startswith('{"type": "meta"')
    assert '"call_log_id": 99' in chunks[0]
    assert chunks[1:] == ["Hel", "lo"]
    assert saved["merged_description_de"] == "Hello"
    assert saved["call_log_id"] == 99
    assert db.committed == 1

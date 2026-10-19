"""Unit tests for the FBF skill status helper (repository doubles, no DB).

Reads and assignments resolve through the ``fbf_skill`` status scope; both the
status repository and the statusable boundary are doubled.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.services import skill_status_service as ss
from app.fbf.services.skill_status_service import _get_skill_status, _set_skill_status

pytestmark = pytest.mark.unit


class _DB:
    """Minimal async-session stand-in (only passed through to the doubles)."""


# ── _get_skill_status ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_skill_status_returns_entry_name(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _entry(_db: Any, _stype: str, _sid: int) -> SimpleNamespace:
        return SimpleNamespace(status=SimpleNamespace(name="active"))

    monkeypatch.setattr(ss.statusable_repository, "get_status", _entry)

    assert await _get_skill_status(_DB(), 1) == "active"


@pytest.mark.asyncio
async def test_get_skill_status_defaults_to_pending_without_entry(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any, _stype: str, _sid: int) -> None:
        return None

    monkeypatch.setattr(ss.statusable_repository, "get_status", _none)

    assert await _get_skill_status(_DB(), 1) == "pending"


@pytest.mark.asyncio
async def test_get_skill_status_queries_the_fbf_skill_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    async def _get(_db: Any, stype: str, sid: int) -> None:
        seen.update(stype=stype, sid=sid)

    monkeypatch.setattr(ss.statusable_repository, "get_status", _get)

    await _get_skill_status(_DB(), 42)

    assert seen == {"stype": "fbf_skill", "sid": 42}


# ── _set_skill_status ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_set_skill_status_resolves_in_scope_and_assigns(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[Any, ...]] = []

    async def _resolve(_db: Any, name: str, stype: str) -> SimpleNamespace:
        calls.append(("resolve", name, stype))
        return SimpleNamespace(id=42)

    async def _set(_db: Any, stype: str, sid: int, status_id: int) -> None:
        calls.append(("set", stype, sid, status_id))

    monkeypatch.setattr(ss.status_repository, "get_by_name_for_type", _resolve)
    monkeypatch.setattr(ss.statusable_repository, "set_status", _set)

    await _set_skill_status(_DB(), 7, "active")

    assert calls == [("resolve", "active", "fbf_skill"), ("set", "fbf_skill", 7, 42)]


@pytest.mark.asyncio
async def test_set_skill_status_is_noop_for_unknown_status(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[Any, ...]] = []

    async def _resolve(_db: Any, _name: str, _stype: str) -> None:
        return None

    async def _set(*args: Any) -> None:
        calls.append(args)

    monkeypatch.setattr(ss.status_repository, "get_by_name_for_type", _resolve)
    monkeypatch.setattr(ss.statusable_repository, "set_status", _set)

    await _set_skill_status(_DB(), 7, "nope")

    assert calls == []

"""Unit tests for the project write-side service (repository doubles, no DB).

Create/delete/status mutations are exercised against doubled repositories and a
commit-counting session double; no database is touched.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.fbf.repositories.project_repository import ProjectRow
from app.fbf.schemas.project_schemas import ProjectCreate, ProjectOut
from app.fbf.services import project_write_service as wr

pytestmark = pytest.mark.unit


class _FakeDB:
    """Session double counting commits (create commits; move_status does not)."""

    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


def _out(project_id: int = 1, *, url: str = "https://example.test/1", title: str = "Project") -> ProjectOut:
    return ProjectOut(
        id=project_id,
        url=url,
        title=title,
        description=None,
        city=None,
        country=None,
        remote_percent=None,
        contract_type=None,
        duration=None,
        start_date=None,
        posted_at=None,
        scraped_at=None,
    )


# ── create ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_rejects_a_duplicate_url(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _existing(_db: object, _url: str) -> ProjectOut:
        return _out(1)

    monkeypatch.setattr(wr.project_repository, "get_by_url_out", _existing)

    with pytest.raises(HTTPException) as exc_info:
        await wr.create(_FakeDB(), ProjectCreate(url="https://example.test/1", title="t"))

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_create_persists_as_master_and_assigns_default_status(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}
    status_set: list[tuple[str, int, int]] = []

    async def _none(_db: object, _url: str) -> None:
        return None

    async def _create(_db: object, *, url: str, title: str, fields: dict[str, object]) -> ProjectOut:
        captured.update(url=url, title=title, fields=fields)
        return _out(7, url=url, title=title)

    async def _name(_db: object, name: str, category: str) -> SimpleNamespace:
        captured["status_name"] = (name, category)
        return SimpleNamespace(id=3)

    async def _set_status(_db: object, stype: str, sid: int, status_id: int) -> None:
        status_set.append((stype, sid, status_id))

    monkeypatch.setattr(wr.project_repository, "get_by_url_out", _none)
    monkeypatch.setattr(wr.project_repository, "create_master", _create)
    monkeypatch.setattr(wr.status_repository, "get_by_name_and_category", _name)
    monkeypatch.setattr(wr.statusable_repository, "set_status", _set_status)

    db = _FakeDB()
    out = await wr.create(db, ProjectCreate(url="u", title="t", city="Berlin"))

    fields = captured["fields"]
    assert out.id == 7
    assert captured["url"] == "u"
    assert captured["title"] == "t"
    assert isinstance(fields, dict)
    assert "url" not in fields and "title" not in fields
    assert fields["city"] == "Berlin"
    assert captured["status_name"] == ("new", "project")
    assert status_set == [("project", 7, 3)]
    assert db.commits == 1


# ── delete ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_missing_project_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _no(_db: object, _pid: int) -> bool:
        return False

    monkeypatch.setattr(wr.project_repository, "exists", _no)

    with pytest.raises(HTTPException) as exc_info:
        await wr.delete(_FakeDB(), 5)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_existing_project_calls_repository(monkeypatch: pytest.MonkeyPatch) -> None:
    deleted: list[int] = []

    async def _yes(_db: object, _pid: int) -> bool:
        return True

    async def _del(_db: object, pid: int) -> None:
        deleted.append(pid)

    monkeypatch.setattr(wr.project_repository, "exists", _yes)
    monkeypatch.setattr(wr.project_repository, "delete_by_id", _del)

    await wr.delete(_FakeDB(), 5)

    assert deleted == [5]


# ── set_status ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_set_status_missing_project_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: object, _pid: int, _status: str) -> None:
        return None

    monkeypatch.setattr(wr.project_repository, "set_status", _none)

    with pytest.raises(HTTPException) as exc_info:
        await wr.set_status(_FakeDB(), 5, "applied")

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_set_status_projects_the_updated_row(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _row(_db: object, _pid: int, _status: str) -> ProjectRow:
        return ProjectRow(project=_out(5), status="applied")

    monkeypatch.setattr(wr.project_repository, "set_status", _row)

    out = await wr.set_status(_FakeDB(), 5, "applied")

    assert out.id == 5
    assert out.status == "applied"


# ── clear_status / move_status ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_clear_status_deletes_the_junction_row(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, int]] = []

    async def _clear(_db: object, stype: str, sid: int) -> None:
        calls.append((stype, sid))

    monkeypatch.setattr(wr.statusable_repository, "clear_status", _clear)

    await wr.clear_status(_FakeDB(), 5)

    assert calls == [("project", 5)]


@pytest.mark.asyncio
async def test_move_status_returns_false_without_source_status(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: object, _stype: str, _pid: int) -> None:
        return None

    monkeypatch.setattr(wr.statusable_repository, "get_status", _none)

    assert await wr.move_status(_FakeDB(), 1, 2) is False


@pytest.mark.asyncio
async def test_move_status_assigns_target_and_clears_source(monkeypatch: pytest.MonkeyPatch) -> None:
    set_calls: list[tuple[str, int, int]] = []
    clear_calls: list[tuple[str, int]] = []

    async def _get(_db: object, _stype: str, _pid: int) -> SimpleNamespace:
        return SimpleNamespace(status_id=3)

    async def _set(_db: object, stype: str, pid: int, status_id: int) -> None:
        set_calls.append((stype, pid, status_id))

    async def _clear(_db: object, stype: str, pid: int) -> None:
        clear_calls.append((stype, pid))

    monkeypatch.setattr(wr.statusable_repository, "get_status", _get)
    monkeypatch.setattr(wr.statusable_repository, "set_status", _set)
    monkeypatch.setattr(wr.statusable_repository, "clear_status", _clear)

    assert await wr.move_status(_FakeDB(), 1, 2) is True
    assert set_calls == [("project", 2, 3)]
    assert clear_calls == [("project", 1)]


# ── archive_stale_projects ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_archive_stale_projects_uses_default_age_and_returns_count(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, int] = {}

    async def _archive(_db: object, *, older_than_days: int) -> int:
        seen["days"] = older_than_days
        return 4

    monkeypatch.setattr(wr.project_repository, "archive_stale_projects", _archive)

    assert await wr.archive_stale_projects(_FakeDB()) == 4
    assert seen["days"] == wr.project_repository.ARCHIVE_AGE_DAYS


@pytest.mark.asyncio
async def test_archive_stale_projects_forwards_custom_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, int] = {}

    async def _archive(_db: object, *, older_than_days: int) -> int:
        seen["days"] = older_than_days
        return 0

    monkeypatch.setattr(wr.project_repository, "archive_stale_projects", _archive)

    await wr.archive_stale_projects(_FakeDB(), older_than_days=90)

    assert seen["days"] == 90

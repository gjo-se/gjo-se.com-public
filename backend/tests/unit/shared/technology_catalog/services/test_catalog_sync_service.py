"""Unit tests for the catalog-sync service orchestration (no DB).

The DB-facing work lives in ``technology_sync_repository`` (tested separately with
a fake session). Here the service is exercised with a fake repository + fake
session at the system boundary, plus the pure status-mapping helper.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.shared.technology_catalog.repositories import technology_sync_repository as sync_repo
from app.shared.technology_catalog.schemas.catalog_source_schemas import CatalogSourceTechnologyOut
from app.shared.technology_catalog.schemas.technology_schemas import TechnologySyncResultOut
from app.shared.technology_catalog.services import catalog_sync_service
from app.shared.technology_catalog.services.catalog_sync_service import _compute_status_name

pytestmark = pytest.mark.unit


def _entry(**overrides: object) -> CatalogSourceTechnologyOut:
    """Build a catalog source entry with sensible defaults and overrides."""
    base: dict[str, object] = {"id": "ext-1", "name": "PostgreSQL"}
    base.update(overrides)
    return CatalogSourceTechnologyOut(**base)


# ── Pure status mapping ───────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        ({"deprecatedAt": "2026-01-01"}, "deprecated"),
        ({"deletedAt": "2026-01-01"}, "deprecated"),
        ({"disabled": True}, "deprecated"),
        ({"status": "approved"}, "approved"),
        ({"status": "pending-review"}, "pending"),
        ({"status": "rejected"}, "rejected"),
        ({}, "pending"),
    ],
)
def test_compute_status_name_follows_documented_priority(overrides: dict[str, object], expected: str) -> None:
    """Deprecation signals win over explicit status; unknown falls back to pending."""
    assert _compute_status_name(_entry(**overrides)) == expected


# ── Orchestration doubles ─────────────────────────────────────────────────────


class _FakeSession:
    """Minimal async session double recording add/commit/rollback."""

    def __init__(self) -> None:
        self.added: list[Any] = []
        self.commits = 0
        self.rollbacks = 0

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1


class _FakeSessionContext:
    """Async context manager yielding a fixed fake session."""

    def __init__(self, session: _FakeSession) -> None:
        self._session = session

    async def __aenter__(self) -> _FakeSession:
        return self._session

    async def __aexit__(self, *_exc: object) -> bool:
        return False


class _FakeClient:
    """Catalog source client double returning a fixed entry list (or raising)."""

    def __init__(self, entries: list[CatalogSourceTechnologyOut], *, fail: bool = False) -> None:
        self._entries = entries
        self._fail = fail
        self.closed = False

    async def fetch_all_technologies(self) -> list[CatalogSourceTechnologyOut]:
        if self._fail:
            raise RuntimeError("catalog source unavailable")
        return self._entries

    async def close(self) -> None:
        self.closed = True


class _FakeEmbedding:
    """Embedding service double returning a fixed count (or raising)."""

    def __init__(self, embedded: int = 0, *, fail: bool = False) -> None:
        self._embedded = embedded
        self._fail = fail

    async def embed_incremental(self, _db: Any) -> int:
        if self._fail:
            raise RuntimeError("embedding failed")
        return self._embedded


class _RepoRecorder:
    """Records how the service drives the repository functions."""

    def __init__(self) -> None:
        self.upsert_ids: list[str] = []
        self.status_calls: list[tuple[int, str]] = []
        self.icon_calls: list[int] = []
        self.deprecated_ids: list[set[str]] = []
        self.finalized: list[tuple[int, int, int]] = []
        self.failed: list[Exception] = []

    def install(self, monkeypatch: pytest.MonkeyPatch, *, upsert_raises_for: str | None = None) -> None:
        """Patch the repository module with recording fakes."""

        async def fake_upsert(_db: Any, entry: CatalogSourceTechnologyOut, result: TechnologySyncResultOut) -> int:
            if entry.id == upsert_raises_for:
                raise RuntimeError("upsert failed")
            self.upsert_ids.append(entry.id)
            result.created += 1
            return len(self.upsert_ids)

        async def fake_statusable(_db: Any, technology_id: int, status_name: str) -> None:
            self.status_calls.append((technology_id, status_name))

        async def fake_icons(_db: Any, technology_id: int, _entry: CatalogSourceTechnologyOut) -> None:
            self.icon_calls.append(technology_id)

        async def fake_mark_deprecated(_db: Any, fetch_ids: set[str]) -> int:
            self.deprecated_ids.append(set(fetch_ids))
            return 2

        async def fake_finalize(
            _db: Any,
            _import_run: Any,
            result: TechnologySyncResultOut,
            total_fetched: int,
        ) -> None:
            self.finalized.append((result.created, result.updated, total_fetched))

        async def fake_fail(_db: Any, _import_run: Any, exc: Exception) -> None:
            self.failed.append(exc)

        monkeypatch.setattr(sync_repo, "upsert_technology", fake_upsert)
        monkeypatch.setattr(sync_repo, "upsert_statusable", fake_statusable)
        monkeypatch.setattr(sync_repo, "ensure_icons", fake_icons)
        monkeypatch.setattr(sync_repo, "mark_deprecated", fake_mark_deprecated)
        monkeypatch.setattr(sync_repo, "finalize_import_run", fake_finalize)
        monkeypatch.setattr(sync_repo, "fail_import_run", fake_fail)


def _wire_session(monkeypatch: pytest.MonkeyPatch, session: _FakeSession) -> None:
    """Point the service's session factory at a fake session context."""
    monkeypatch.setattr(catalog_sync_service, "AsyncSessionLocal", lambda: _FakeSessionContext(session))


def _wire_client(monkeypatch: pytest.MonkeyPatch, client: _FakeClient) -> None:
    """Point the service's catalog source client factory at a fake client."""
    monkeypatch.setattr(catalog_sync_service, "get_catalog_source_client", lambda: client)


# ── run_catalog_sync ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_catalog_sync_records_counts_and_finalizes(monkeypatch: pytest.MonkeyPatch) -> None:
    """A successful run syncs entries, marks deprecated and finalizes the audit run."""
    entries = [_entry(id="a"), _entry(id="b")]
    session = _FakeSession()
    client = _FakeClient(entries)
    recorder = _RepoRecorder()
    recorder.install(monkeypatch)
    _wire_session(monkeypatch, session)
    _wire_client(monkeypatch, client)

    result = await catalog_sync_service.run_catalog_sync(_FakeEmbedding(embedded=5))

    assert result.created == 2
    assert result.deprecated == 2
    assert result.embedded == 5
    assert recorder.deprecated_ids == [{"a", "b"}]
    assert recorder.finalized == [(2, 0, 2)]
    assert recorder.failed == []
    assert client.closed is True
    assert any(getattr(obj, "status", None) == "running" for obj in session.added)


@pytest.mark.asyncio
async def test_run_catalog_sync_continues_when_deprecated_marking_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A failing deprecated-marking step rolls back and the sync still finalizes."""
    session = _FakeSession()
    recorder = _RepoRecorder()
    recorder.install(monkeypatch)
    _wire_session(monkeypatch, session)
    _wire_client(monkeypatch, _FakeClient([_entry(id="a")]))

    async def failing_mark(_db: Any, _fetch_ids: set[str]) -> int:
        raise RuntimeError("deprecated down")

    monkeypatch.setattr(sync_repo, "mark_deprecated", failing_mark)

    result = await catalog_sync_service.run_catalog_sync(_FakeEmbedding())

    assert session.rollbacks >= 1
    assert recorder.finalized
    assert recorder.failed == []
    assert result.deprecated == 0


@pytest.mark.asyncio
async def test_run_catalog_sync_continues_when_embedding_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    """A failing embedding step does not abort the sync and is not an error count."""
    session = _FakeSession()
    recorder = _RepoRecorder()
    recorder.install(monkeypatch)
    _wire_session(monkeypatch, session)
    _wire_client(monkeypatch, _FakeClient([_entry(id="a")]))

    result = await catalog_sync_service.run_catalog_sync(_FakeEmbedding(fail=True))

    assert result.embedded == 0
    assert recorder.finalized
    assert recorder.failed == []
    assert result.errors == 0


@pytest.mark.asyncio
async def test_run_catalog_sync_propagates_fetch_error_and_marks_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A fetch failure marks the import run as failed and re-raises."""
    session = _FakeSession()
    client = _FakeClient([], fail=True)
    recorder = _RepoRecorder()
    recorder.install(monkeypatch)
    _wire_session(monkeypatch, session)
    _wire_client(monkeypatch, client)

    with pytest.raises(RuntimeError, match="catalog source unavailable"):
        await catalog_sync_service.run_catalog_sync(_FakeEmbedding())

    assert len(recorder.failed) == 1
    assert isinstance(recorder.failed[0], RuntimeError)
    assert recorder.finalized == []
    assert client.closed is True


# ── _sync_entries ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_sync_entries_counts_error_and_continues(monkeypatch: pytest.MonkeyPatch) -> None:
    """An entry that fails to upsert is counted, rolled back and the loop continues."""
    session = _FakeSession()
    recorder = _RepoRecorder()
    recorder.install(monkeypatch, upsert_raises_for="bad")
    result = TechnologySyncResultOut()

    fetch_ids = await catalog_sync_service._sync_entries(
        session,
        [_entry(id="bad"), _entry(id="good")],
        result,
    )

    assert fetch_ids == {"bad", "good"}
    assert result.errors == 1
    assert result.created == 1
    assert session.rollbacks == 1


@pytest.mark.asyncio
async def test_sync_entries_disables_status_after_first_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Once status resolution fails, status updates are skipped for later entries."""
    session = _FakeSession()
    recorder = _RepoRecorder()
    recorder.install(monkeypatch)
    result = TechnologySyncResultOut()
    status_attempts: list[int] = []

    async def failing_statusable(_db: Any, technology_id: int, _status_name: str) -> None:
        status_attempts.append(technology_id)
        raise RuntimeError("status table down")

    monkeypatch.setattr(sync_repo, "upsert_statusable", failing_statusable)

    await catalog_sync_service._sync_entries(
        session,
        [_entry(id="a"), _entry(id="b")],
        result,
    )

    assert status_attempts == [1]
    assert result.created == 2
    assert result.errors == 0
    assert len(recorder.icon_calls) == 2

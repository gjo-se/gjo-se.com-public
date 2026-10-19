"""Unit tests for the Project embedding operations (wrapper + backfill guard)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.services import project_embedding_service as svc

pytestmark = pytest.mark.unit


class _FakeEmbeddingService:
    """Records delegations without doing any I/O."""

    def __init__(self) -> None:
        self.calls: list[tuple[Any, Any]] = []

    async def embed_project(self, project: Any, db: Any) -> None:
        self.calls.append((project, db))


@pytest.mark.asyncio
async def test_embed_project_wrapper_delegates_to_service() -> None:
    """The composition-root wrapper forwards to the wired service."""
    service: Any = _FakeEmbeddingService()
    db: Any = object()
    project: Any = object()

    await svc.embed_project(project, db, embedding_service=service)

    assert service.calls == [(project, db)]


class _EmptyResult:
    """A result whose ``scalars().all()`` yields nothing."""

    def scalars(self) -> _EmptyResult:
        return self

    def all(self) -> list[Any]:
        return []


class _FakeDb:
    """Minimal async session stub for the empty-pending path."""

    async def execute(self, _stmt: Any) -> _EmptyResult:
        return _EmptyResult()

    async def commit(self) -> None:  # pragma: no cover - not reached
        raise AssertionError("commit must not run when nothing is pending")


@pytest.mark.asyncio
async def test_backfill_returns_zero_without_pending_projects() -> None:
    """With no projects lacking a vector the backfill is a no-op."""
    db: Any = _FakeDb()
    client: Any = object()

    embedded = await svc.backfill_project_vectors(db, embedding_client=client)

    assert embedded == 0


# ── backfill with pending projects (fake repository + client) ────────────────


class _CoreCtx:
    async def __aenter__(self) -> object:
        return object()

    async def __aexit__(self, *_a: Any) -> bool:
        return False


class _Db:
    def __init__(self) -> None:
        self.committed = 0

    async def commit(self) -> None:
        self.committed += 1


def _patch(monkeypatch: pytest.MonkeyPatch, pending: list[Any], **fns: Any) -> list[tuple[int, Any]]:
    stored: list[tuple[int, Any]] = []

    async def _pending(_db: Any, *, limit: Any = None) -> list[Any]:
        return pending

    async def _set(_db: Any, pid: int, vector: Any) -> None:
        stored.append((pid, vector))

    monkeypatch.setattr(svc.project_repository, "get_projects_without_vector", _pending)
    monkeypatch.setattr(svc.project_repository, "open_core_session", _CoreCtx)
    monkeypatch.setattr(svc.project_repository, "set_vector", _set)
    monkeypatch.setattr(svc, "build_embedding_text_for_project", lambda p: f"text-{p.id}")
    for name, fn in fns.items():
        monkeypatch.setattr(svc, name, fn)
    return stored


def _projects(n: int) -> list[Any]:
    return [SimpleNamespace(id=i) for i in range(n)]


@pytest.mark.asyncio
async def test_backfill_batch_success_stores_all(monkeypatch: pytest.MonkeyPatch) -> None:
    """A successful batch stores one vector per project."""
    stored = _patch(monkeypatch, _projects(3))

    class _Client:
        async def embed_many(self, texts: list[str], _core: Any) -> list[list[float]]:
            return [[0.1] for _ in texts]

    db = _Db()
    embedded = await svc.backfill_project_vectors(db, embedding_client=_Client())
    assert embedded == 3
    assert [pid for pid, _ in stored] == [0, 1, 2]
    assert db.committed == 1


@pytest.mark.asyncio
async def test_backfill_batch_size_mismatch_falls_back_to_single(monkeypatch: pytest.MonkeyPatch) -> None:
    """A short batch falls back to per-project embed_text."""
    stored = _patch(monkeypatch, _projects(2))
    singles: list[str] = []

    class _Client:
        async def embed_many(self, _texts: list[str], _core: Any) -> list[list[float]]:
            return [[0.1]]  # wrong length → batch_ok False

        async def embed_text(self, text: str, _core: Any) -> list[float]:
            singles.append(text)
            return [0.9]

    embedded = await svc.backfill_project_vectors(_Db(), embedding_client=_Client())
    assert embedded == 2
    assert singles == ["text-0", "text-1"]
    assert [pid for pid, _ in stored] == [0, 1]


@pytest.mark.asyncio
async def test_backfill_batch_exception_falls_back_to_single(monkeypatch: pytest.MonkeyPatch) -> None:
    """A raised batch error triggers the per-project fallback."""
    stored = _patch(monkeypatch, _projects(1))

    class _Client:
        async def embed_many(self, _texts: list[str], _core: Any) -> list[list[float]]:
            raise RuntimeError("batch down")

        async def embed_text(self, _text: str, _core: Any) -> list[float]:
            return [1.0]

    embedded = await svc.backfill_project_vectors(_Db(), embedding_client=_Client())
    assert embedded == 1
    assert [pid for pid, _ in stored] == [0]


@pytest.mark.asyncio
async def test_backfill_single_failure_is_skipped(monkeypatch: pytest.MonkeyPatch) -> None:
    """A failing single embed is skipped without aborting the run."""
    stored = _patch(monkeypatch, _projects(2))

    class _Client:
        async def embed_many(self, _texts: list[str], _core: Any) -> list[list[float]]:
            raise RuntimeError("batch down")

        async def embed_text(self, text: str, _core: Any) -> list[float]:
            if text == "text-0":
                raise RuntimeError("single down")
            return [1.0]

    embedded = await svc.backfill_project_vectors(_Db(), embedding_client=_Client())
    assert embedded == 1
    assert [pid for pid, _ in stored] == [1]


@pytest.mark.asyncio
async def test_backfill_chunks_by_batch_size(monkeypatch: pytest.MonkeyPatch) -> None:
    """25 pending projects are embedded in two chunks of at most 20."""
    _patch(monkeypatch, _projects(25))
    calls: list[int] = []

    class _Client:
        async def embed_many(self, texts: list[str], _core: Any) -> list[list[float]]:
            calls.append(len(texts))
            return [[0.1] for _ in texts]

    embedded = await svc.backfill_project_vectors(_Db(), embedding_client=_Client())
    assert embedded == 25
    assert calls == [20, 5]

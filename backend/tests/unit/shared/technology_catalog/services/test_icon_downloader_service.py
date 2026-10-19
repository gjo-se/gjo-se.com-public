"""Unit tests for the icon-downloader pure helpers (rate-limit + backoff)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from functools import partial
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
import respx
from httpx import Response

from app.shared.technology_catalog.repositories import icon_download_repository
from app.shared.technology_catalog.schemas.technology_schemas import IconDownloadResultOut
from app.shared.technology_catalog.services import icon_downloader_service
from app.shared.technology_catalog.services.icon_downloader_service import (
    _adaptive_delay,
    _BackoffState,
    _decrease_backoff,
    _increase_backoff,
    _is_rate_limit_status,
    _persist_svg,
    _process_single_icon,
    _record_failure,
)

pytestmark = pytest.mark.unit

_TEST_ICON_CDN = "https://cdn.test/icons"


@pytest.fixture(autouse=True)
def _configure_icon_cdn(monkeypatch: pytest.MonkeyPatch) -> None:
    """Point the icon downloader at a hermetic test CDN."""
    monkeypatch.setattr(icon_downloader_service.settings, "TECHNOLOGY_CATALOG_ICON_CDN", _TEST_ICON_CDN)


@pytest.mark.parametrize(
    ("status_code", "expected"),
    [
        (429, True),
        (500, True),
        (503, True),
        (599, True),
        (200, False),
        (404, False),
        (430, False),
        (399, False),
        (499, False),
        (600, False),
    ],
)
def test_is_rate_limit_status_classifies_429_and_5xx(status_code: int, expected: bool) -> None:
    """Only exactly 429 and 500–599 are treated as rate-limit/server errors."""
    assert _is_rate_limit_status(status_code) is expected


def test_increase_backoff_starts_at_base_and_doubles() -> None:
    """Backoff starts at the base value (30s) and doubles."""
    state = _BackoffState()

    _increase_backoff(state)
    assert state.value == 30.0
    _increase_backoff(state)
    assert state.value == 60.0


def test_increase_backoff_never_exceeds_cap() -> None:
    """Repeated increases are capped at 120s."""
    state = _BackoffState()

    for _ in range(10):
        _increase_backoff(state)

    assert state.value == 120.0


def test_decrease_backoff_halves_and_floors_at_zero() -> None:
    """Backoff decays by integer half (floor) on success and never goes negative."""
    state = _BackoffState(value=60.0)

    _decrease_backoff(state)
    assert state.value == 30.0
    odd = _BackoffState(value=61.0)
    _decrease_backoff(odd)
    assert odd.value == 30.0
    _decrease_backoff(_BackoffState(value=0.0))
    assert _BackoffState(value=0.0).value == 0.0


def test_backoff_state_defaults_to_zero() -> None:
    """A fresh backoff state starts with no penalty."""
    assert _BackoffState().value == 0.0


def test_adaptive_delay_stays_within_jitter_bounds_without_backoff(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The jitter is drawn from exactly the configured window (5–15s)."""
    seen: list[tuple[float, float]] = []

    def _uniform(a: float, b: float) -> float:
        seen.append((a, b))
        return 7.0

    monkeypatch.setattr(icon_downloader_service.random, "uniform", _uniform)

    assert _adaptive_delay(_BackoffState()) == 7.0
    assert seen == [(5.0, 15.0)]


def test_adaptive_delay_adds_backoff_penalty(monkeypatch: pytest.MonkeyPatch) -> None:
    """The current backoff value is added on top of the jitter window."""
    monkeypatch.setattr(icon_downloader_service.random, "uniform", lambda _a, _b: 5.0)

    assert _adaptive_delay(_BackoffState(value=100.0)) == 105.0


# ── process / failure / persist (fake DB + store + respx) ────────────────────


class _FakeDB:
    """Async-session double for icon processing."""

    def __init__(self, icon: Any) -> None:
        self._icon = icon
        self.commits = 0
        self.rollbacks = 0

    async def get(self, _model: Any, _pk: int, options: Any = None) -> Any:
        return self._icon

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1


class _FakeStore:
    """Object-store double recording ``put`` calls."""

    def __init__(self) -> None:
        self.puts: list[tuple[str, bytes]] = []

    async def put(self, key: str, data: bytes) -> None:
        self.puts.append((key, data))


def _icon(**over: Any) -> Any:
    """Build a technology-icon double with a related technology."""
    base: dict[str, Any] = {
        "id": 1,
        "variant": "dark",
        "icon_external_id": "abc",
        "storage_key": None,
        "downloaded_at": None,
        "file_size": None,
        "content_hash": None,
        "retry_count": 0,
        "last_error": None,
        "last_attempt_at": None,
        "svg_storage_key": None,
        "svg_downloaded_at": None,
        "svg_file_size": None,
        "technology": SimpleNamespace(slug="py", id=1),
    }
    base.update(over)
    return SimpleNamespace(**base)


@pytest.mark.unit
async def test_record_failure_missing_icon_counts_failed() -> None:
    """A missing icon is counted as failed after the rollback."""
    result = IconDownloadResultOut()
    db = _FakeDB(None)

    await _record_failure(db, result, 1, "err")

    assert result.failed == 1
    assert db.rollbacks == 1


@pytest.mark.unit
async def test_record_failure_increments_retry_and_truncates_error() -> None:
    """The retry counter is incremented and the error truncated to 500 chars."""
    icon = _icon()
    result = IconDownloadResultOut()
    db = _FakeDB(icon)

    await _record_failure(db, result, 1, "x" * 600)

    assert icon.retry_count == 1
    assert len(icon.last_error) == 500
    assert db.commits == 1
    assert result.failed == 1


@pytest.mark.unit
async def test_persist_svg_skipped_counts_skip(monkeypatch: pytest.MonkeyPatch) -> None:
    """A None vectorization result is counted as an SVG skip."""

    async def _vectorize(_png: bytes, _key: str, _store: Any) -> None:
        return None

    monkeypatch.setattr(icon_downloader_service, "vectorize_icon", _vectorize)
    icon = _icon()
    result = IconDownloadResultOut()

    await _persist_svg(_FakeDB(icon), _FakeStore(), result, icon, "py", b"png")

    assert result.svg_skipped == 1
    assert result.svg_converted == 0


@pytest.mark.unit
async def test_persist_svg_converted_counts_and_commits(monkeypatch: pytest.MonkeyPatch) -> None:
    """A returned SVG is persisted and counted."""

    async def _vectorize(_png: bytes, _key: str, _store: Any) -> bytes:
        return b"svgdata"

    monkeypatch.setattr(icon_downloader_service, "vectorize_icon", _vectorize)
    icon = _icon()
    result = IconDownloadResultOut()
    db = _FakeDB(icon)

    await _persist_svg(db, _FakeStore(), result, icon, "py", b"png")

    assert result.svg_converted == 1
    assert icon.svg_file_size == 7
    assert db.commits == 1


@pytest.mark.unit
async def test_process_single_icon_missing_icon_counts_failed() -> None:
    """A deleted icon is counted as failed without a download."""
    result = IconDownloadResultOut()

    await _process_single_icon(1, _FakeStore(), result, _FakeDB(None), _BackoffState())

    assert result.failed == 1


@pytest.mark.unit
async def test_process_single_icon_success_downloads_and_persists(monkeypatch: pytest.MonkeyPatch) -> None:
    """A 200 download stores the PNG, commits and vectorizes the SVG."""
    icon = _icon()
    db = _FakeDB(icon)
    store = _FakeStore()
    result = IconDownloadResultOut()

    async def _vectorize(_png: bytes, _key: str, _store: Any) -> bytes:
        return b"svg"

    monkeypatch.setattr(icon_downloader_service, "vectorize_icon", _vectorize)

    with respx.mock:
        respx.get(f"{_TEST_ICON_CDN}/dark/abc.png").mock(return_value=Response(200, content=b"pngdata"))
        await _process_single_icon(1, store, result, db, _BackoffState())

    assert result.downloaded == 1
    assert icon.storage_key == "technology-catalog/py_dark.png"
    assert store.puts
    assert db.commits >= 1


@pytest.mark.unit
async def test_process_single_icon_rate_limit_increases_backoff() -> None:
    """A 429 response increases the backoff and records a failure."""
    icon = _icon()
    result = IconDownloadResultOut()
    backoff = _BackoffState()

    with respx.mock:
        respx.get(f"{_TEST_ICON_CDN}/dark/abc.png").mock(return_value=Response(429))
        await _process_single_icon(1, _FakeStore(), result, _FakeDB(icon), backoff)

    assert result.failed == 1
    assert backoff.value == 30.0


@pytest.mark.unit
async def test_process_single_icon_network_error_records_failure() -> None:
    """A network error is recorded as a failure."""
    icon = _icon()
    result = IconDownloadResultOut()

    with respx.mock:
        respx.get(f"{_TEST_ICON_CDN}/dark/abc.png").mock(side_effect=httpx.ConnectError("down"))
        await _process_single_icon(1, _FakeStore(), result, _FakeDB(icon), _BackoffState())

    assert result.failed == 1


# ── retry boundary + drain-until-empty loop ──────────────────────────────────


class _FakeLogger:
    """Structlog double recording info/warning calls."""

    def __init__(self) -> None:
        self.infos: list[tuple[str, dict[str, Any]]] = []
        self.warnings: list[tuple[str, dict[str, Any]]] = []

    def info(self, event: str, **kw: Any) -> None:
        self.infos.append((event, kw))

    def warning(self, event: str, **kw: Any) -> None:
        self.warnings.append((event, kw))

    def exception(self, event: str, **kw: Any) -> None:
        del event, kw


class _Clock:
    """Deterministic ``datetime`` replacement yielding a fixed sequence of ``now``."""

    def __init__(self, *values: datetime) -> None:
        self._values = list(values)

    def now(self, _tz: Any) -> datetime:
        return self._values.pop(0) if len(self._values) > 1 else self._values[0]


class _Scalars:
    def __init__(self, rows: list[int]) -> None:
        self._rows = rows

    def all(self) -> list[int]:
        return list(self._rows)


class _Exec:
    def __init__(self, rows: list[int]) -> None:
        self._rows = rows

    def scalars(self) -> _Scalars:
        return _Scalars(self._rows)


class _ResultDB:
    """Fake session whose ``execute`` replays canned results or raises."""

    def __init__(self, results: list[Any]) -> None:
        self._results = list(results)

    async def execute(self, _stmt: Any) -> _Exec:
        result = self._results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


class _SessionCtx:
    """Async context manager standing in for ``AsyncSessionLocal()``."""

    def __init__(self, db: _ResultDB) -> None:
        self._db = db

    async def __aenter__(self) -> _ResultDB:
        return self._db

    async def __aexit__(self, *_exc: object) -> bool:
        return False


async def test_record_failure_warns_exactly_at_max_retries(monkeypatch: pytest.MonkeyPatch) -> None:
    """The 'max retries' warning fires on the 5th failure, not before."""
    logger = _FakeLogger()
    monkeypatch.setattr(icon_downloader_service, "logger", logger)

    below = _icon(retry_count=3)
    await _record_failure(_FakeDB(below), IconDownloadResultOut(), 1, "e")
    assert below.retry_count == 4
    assert logger.warnings == []

    at_max = _icon(retry_count=4)
    await _record_failure(_FakeDB(at_max), IconDownloadResultOut(), 1, "e")
    assert at_max.retry_count == 5
    assert len(logger.warnings) == 1


async def test_run_icon_downloader_stops_when_queue_drained(monkeypatch: pytest.MonkeyPatch) -> None:
    """An empty chunk ends the run with ``drained=True`` and no second query."""
    start = datetime(2024, 1, 1, tzinfo=UTC)
    logger = _FakeLogger()
    monkeypatch.setattr(icon_downloader_service, "logger", logger)
    monkeypatch.setattr(
        icon_downloader_service,
        "datetime",
        _Clock(start, start + timedelta(seconds=37)),
    )
    db = _ResultDB([_Exec([]), RuntimeError("unexpected second query")])
    monkeypatch.setattr(icon_downloader_service, "AsyncSessionLocal", partial(_SessionCtx, db))
    monkeypatch.setattr(icon_downloader_service, "get_object_store", _FakeStore)

    result = await icon_downloader_service.run_icon_downloader()

    assert result.drained is True
    assert logger.infos[0][1]["elapsed_minutes"] == 0.6


async def test_run_icon_downloader_stops_at_time_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reaching the runtime limit ends the run with ``drained=False``."""
    start = datetime(2024, 1, 1, tzinfo=UTC)
    logger = _FakeLogger()
    monkeypatch.setattr(icon_downloader_service, "logger", logger)
    monkeypatch.setattr(
        icon_downloader_service,
        "datetime",
        _Clock(start, start + timedelta(minutes=90)),
    )
    db = _ResultDB([RuntimeError("no query expected before the limit")])
    monkeypatch.setattr(icon_downloader_service, "AsyncSessionLocal", partial(_SessionCtx, db))
    monkeypatch.setattr(icon_downloader_service, "get_object_store", _FakeStore)

    result = await icon_downloader_service.run_icon_downloader()

    assert result.drained is False
    assert logger.infos[0][1]["elapsed_minutes"] == 90.0


async def test_run_icon_downloader_processes_chunk_with_delay_between_icons(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Every icon after the first is processed with one adaptive delay; chunk size is 50."""
    start = datetime(2024, 1, 1, tzinfo=UTC)
    logger = _FakeLogger()
    monkeypatch.setattr(icon_downloader_service, "logger", logger)
    monkeypatch.setattr(
        icon_downloader_service,
        "datetime",
        _Clock(start, start + timedelta(seconds=20), start + timedelta(seconds=40)),
    )
    db = _ResultDB([_Exec([1, 2]), _Exec([])])
    monkeypatch.setattr(icon_downloader_service, "AsyncSessionLocal", partial(_SessionCtx, db))
    monkeypatch.setattr(icon_downloader_service, "get_object_store", _FakeStore)

    # Run the real per-icon path; the repository boundary returns "icon gone" so
    # each icon is counted without a network call.
    async def _no_icon(_db: Any, _icon_id: int) -> None:
        return None

    monkeypatch.setattr(icon_download_repository, "load_icon_with_technology", _no_icon)

    sleeps: list[float] = []

    async def _fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    monkeypatch.setattr(icon_downloader_service.asyncio, "sleep", _fake_sleep)

    result = await icon_downloader_service.run_icon_downloader()

    assert result.drained is True
    assert result.failed == 2
    assert len(sleeps) == 1
    assert icon_downloader_service.CHUNK_SIZE == 50
    assert logger.infos[0][1]["elapsed_minutes"] == 0.3

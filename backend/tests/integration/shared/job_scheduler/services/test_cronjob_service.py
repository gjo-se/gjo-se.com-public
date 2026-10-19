"""Unit tests for the CronJobService validation paths (no DB access)."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any, cast

import pytest
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.jobstores.base import JobLookupError
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.job_scheduler.domain.cronjob_registry_rules import KNOWN_CRON_JOBS
from app.shared.job_scheduler.schemas.cron_job_config_schemas import CronJobConfigUpdate
from app.shared.job_scheduler.services import cronjob_service
from app.shared.job_scheduler.services.cronjob_service import (
    CronJobService,
    _enrich_response,
    _is_job_active,
)

pytestmark = pytest.mark.integration


def _service() -> CronJobService:
    """Build a service over the real registry with no registered job functions."""
    return CronJobService(list(KNOWN_CRON_JOBS), {})


def _db() -> AsyncSession:
    """Placeholder session – the validated paths abort before any DB access."""
    return cast(AsyncSession, None)


def _scheduler() -> AsyncIOScheduler:
    """Placeholder scheduler – never used on the error paths under test."""
    return cast(AsyncIOScheduler, None)


async def test_update_job_unknown_key_raises_not_found_before_db_access() -> None:
    """Updating an unregistered job key fails with 404."""
    with pytest.raises(HTTPException) as exc_info:
        await _service().update_job(
            _db(),
            "not_registered",
            CronJobConfigUpdate(cron_expression="0 1 * * *"),
            _scheduler(),
        )

    assert exc_info.value.status_code == 404


async def test_execute_now_unknown_key_raises_not_found_before_db_access() -> None:
    """Running an unregistered job key fails with 404."""
    with pytest.raises(HTTPException) as exc_info:
        await _service().execute_now(_db(), "not_registered", _scheduler())

    assert exc_info.value.status_code == 404


async def test_execute_now_known_key_without_function_raises_bad_request() -> None:
    """A registered key without a bound function fails with 400."""
    with pytest.raises(HTTPException) as exc_info:
        await _service().execute_now(_db(), "nightly_eval", _scheduler())

    assert exc_info.value.status_code == 400


# ── fakes & helpers ──────────────────────────────────────────────────────────

_DEFN = next(d for d in KNOWN_CRON_JOBS if d.key == "nightly_eval")


def _config(**over: Any) -> SimpleNamespace:
    """Build a persisted config double."""
    base: dict[str, Any] = {
        "id": 7,
        "key": _DEFN.key,
        "cron_expression": "0 3 * * *",
        "last_run_at": None,
        "next_run_at": None,
    }
    base.update(over)
    return SimpleNamespace(**base)


class _FakeTrigger:
    """Captures the crontab string passed to ``CronTrigger.from_crontab``."""

    seen: list[str] = []

    @staticmethod
    def from_crontab(expression: str) -> str:
        _FakeTrigger.seen.append(expression)
        return f"trigger:{expression}"


class _FakeScheduler:
    """APScheduler double recording every mutation."""

    def __init__(self, job: Any = None, reschedule_raises: bool = False) -> None:
        self.added: list[tuple[Any, str, bool]] = []
        self.paused: list[str] = []
        self.resumed: list[str] = []
        self.rescheduled: list[str] = []
        self.listeners: list[tuple[Any, int]] = []
        self._job = job
        self._reschedule_raises = reschedule_raises

    def add_job(self, func: Any, _trigger: Any, **kwargs: Any) -> None:
        self.added.append((func, kwargs["id"], kwargs["replace_existing"]))

    def pause_job(self, key: str) -> None:
        self.paused.append(key)

    def resume_job(self, key: str) -> None:
        self.resumed.append(key)

    def reschedule_job(self, key: str, *, trigger: Any) -> None:
        del trigger
        if self._reschedule_raises:
            raise JobLookupError(key)
        self.rescheduled.append(key)

    def add_listener(self, callback: Any, mask: int) -> None:
        self.listeners.append((callback, mask))

    def get_job(self, _key: str) -> Any:
        return self._job


# ── _enrich_response ─────────────────────────────────────────────────────────


def test_enrich_response_uses_persisted_config_values() -> None:
    """With a persisted row the response carries its id, cron and timestamps."""
    last = datetime(2024, 1, 1, tzinfo=UTC)
    nxt = datetime(2024, 1, 2, tzinfo=UTC)

    out = _enrich_response(_config(id=42, cron_expression="5 5 * * *", last_run_at=last, next_run_at=nxt), _DEFN)

    assert out.id == 42
    assert out.cron_expression == "5 5 * * *"
    assert out.last_run_at == last
    assert out.next_run_at == nxt
    assert out.status is None
    assert out.status_color_token is None


def test_enrich_response_without_config_falls_back_to_defaults() -> None:
    """Without a row the response uses the registry default and no timestamps."""
    out = _enrich_response(None, _DEFN)

    assert out.id is None
    assert out.cron_expression == _DEFN.default_cron
    assert out.last_run_at is None
    assert out.next_run_at is None


# ── _is_job_active ───────────────────────────────────────────────────────────


async def test_is_job_active_true_without_config(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing config row counts as active."""

    async def _no_config(_db: Any, _key: str) -> None:
        return None

    monkeypatch.setattr(cronjob_service, "get_by_key", _no_config)

    assert await _is_job_active(_db(), "k") is True


async def test_is_job_active_true_without_status_row(monkeypatch: pytest.MonkeyPatch) -> None:
    """A config without core-status also counts as active."""

    async def _config_row(_db: Any, _key: str) -> Any:
        return _config()

    async def _no_status(_db: Any, _table: str, _pk: int) -> None:
        return None

    monkeypatch.setattr(cronjob_service, "get_by_key", _config_row)
    monkeypatch.setattr(cronjob_service, "get_core_status", _no_status)

    assert await _is_job_active(_db(), "k") is True


@pytest.mark.parametrize(("name", "expected"), [("active", True), ("inactive", False), ("disabled", False)])
async def test_is_job_active_compares_status_name(name: str, expected: bool, monkeypatch: pytest.MonkeyPatch) -> None:
    """Only the exact status name 'active' counts as active."""

    async def _config_row(_db: Any, _key: str) -> Any:
        return _config()

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name=name))

    monkeypatch.setattr(cronjob_service, "get_by_key", _config_row)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)

    assert await _is_job_active(_db(), "k") is expected


# ── register_all ─────────────────────────────────────────────────────────────


async def test_register_all_adds_active_job(monkeypatch: pytest.MonkeyPatch) -> None:
    """An active job is registered with replace_existing and the configured cron."""
    _FakeTrigger.seen = []
    monkeypatch.setattr(cronjob_service, "CronTrigger", _FakeTrigger)

    async def _config_row(_db: Any, _key: str) -> Any:
        return _config(cron_expression="0 3 * * *")

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="active"))

    monkeypatch.setattr(cronjob_service, "get_by_key", _config_row)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)

    def run() -> None:
        return None

    svc = CronJobService([_DEFN], {_DEFN.key: run})
    sched = _FakeScheduler()

    await svc.register_all(_db(), sched)

    assert sched.added == [(run, _DEFN.key, True)]
    assert _FakeTrigger.seen == ["0 3 * * *"]
    assert sched.listeners[0][1] == EVENT_JOB_EXECUTED | EVENT_JOB_ERROR


async def test_register_all_pauses_inactive_job(monkeypatch: pytest.MonkeyPatch) -> None:
    """An inactive job is registered as a no-op and paused."""
    monkeypatch.setattr(cronjob_service, "CronTrigger", _FakeTrigger)

    async def _config_row(_db: Any, _key: str) -> Any:
        return _config(cron_expression="")

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="inactive"))

    monkeypatch.setattr(cronjob_service, "get_by_key", _config_row)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)

    def configured_job() -> None:
        return None

    svc = CronJobService([_DEFN], {_DEFN.key: configured_job})
    sched = _FakeScheduler()

    await svc.register_all(_db(), sched)

    # Inactive job: a no-op placeholder is registered instead of the real job.
    registered_job = sched.added[0][0]
    assert registered_job is not configured_job
    assert registered_job() is None
    assert sched.paused == [_DEFN.key]


async def test_register_all_skips_active_job_without_function(monkeypatch: pytest.MonkeyPatch) -> None:
    """An active job without a bound function is not registered."""
    monkeypatch.setattr(cronjob_service, "CronTrigger", _FakeTrigger)

    async def _config_row(_db: Any, _key: str) -> Any:
        return _config()

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="active"))

    monkeypatch.setattr(cronjob_service, "get_by_key", _config_row)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)
    svc = CronJobService([_DEFN], {})
    sched = _FakeScheduler()

    await svc.register_all(_db(), sched)

    assert sched.added == []


async def test_register_all_uses_default_cron_when_config_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """An empty persisted cron expression falls back to the registry default."""
    _FakeTrigger.seen = []
    monkeypatch.setattr(cronjob_service, "CronTrigger", _FakeTrigger)

    async def _config_row(_db: Any, _key: str) -> Any:
        return _config(cron_expression="")

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="active"))

    monkeypatch.setattr(cronjob_service, "get_by_key", _config_row)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)
    svc = CronJobService([_DEFN], {_DEFN.key: lambda: None})

    await svc.register_all(_db(), _FakeScheduler())

    assert _FakeTrigger.seen == [_DEFN.default_cron]


# ── list_all ─────────────────────────────────────────────────────────────────


async def test_list_all_merges_rows_and_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    """Configured rows are enriched; registry entries without a row get defaults."""
    other = next(d for d in KNOWN_CRON_JOBS if d.key != _DEFN.key)

    async def _rows(_db: Any) -> list[Any]:
        return [(_config(id=9), "active", "green")]

    monkeypatch.setattr(cronjob_service, "list_all", _rows)
    svc = CronJobService([_DEFN, other], {})

    results = await svc.list_all(_db())

    assert results[0].id == 9
    assert results[0].status == "active"
    assert results[0].status_color_token == "green"
    assert results[1].id is None
    assert results[1].status is None


# ── update_job ───────────────────────────────────────────────────────────────


async def test_update_job_reschedules_and_resumes_active(monkeypatch: pytest.MonkeyPatch) -> None:
    """An active job is rescheduled and resumed."""
    monkeypatch.setattr(cronjob_service, "CronTrigger", _FakeTrigger)

    async def _upsert(_db: Any, *, key: str, cron_expression: str) -> Any:
        return _config(cron_expression=cron_expression)

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="active"))

    async def _get(_db: Any, _key: str) -> Any:
        return _config()

    monkeypatch.setattr(cronjob_service, "upsert", _upsert)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)
    monkeypatch.setattr(cronjob_service, "get_by_key", _get)
    svc = CronJobService([_DEFN], {_DEFN.key: lambda: None})
    sched = _FakeScheduler()

    out = await svc.update_job(_db(), _DEFN.key, CronJobConfigUpdate(cron_expression="1 2 * * *"), sched)

    assert sched.rescheduled == [_DEFN.key]
    assert sched.resumed == [_DEFN.key]
    assert sched.paused == []
    assert out.status == "active"
    assert out.status_color_token == "green"


async def test_update_job_pauses_inactive_and_readds_on_lookup_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing live job is re-added (paused when inactive)."""
    monkeypatch.setattr(cronjob_service, "CronTrigger", _FakeTrigger)

    async def _upsert(_db: Any, *, key: str, cron_expression: str) -> Any:
        return _config(cron_expression=cron_expression)

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="inactive"))

    async def _get(_db: Any, _key: str) -> Any:
        return _config()

    monkeypatch.setattr(cronjob_service, "upsert", _upsert)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)
    monkeypatch.setattr(cronjob_service, "get_by_key", _get)

    def run() -> None:
        return None

    svc = CronJobService([_DEFN], {_DEFN.key: run})
    sched = _FakeScheduler(reschedule_raises=True)

    out = await svc.update_job(_db(), _DEFN.key, CronJobConfigUpdate(cron_expression="1 2 * * *"), sched)

    assert sched.added == [(run, _DEFN.key, True)]
    assert sched.paused == [_DEFN.key]
    assert out.status == "inactive"
    assert out.status_color_token == "gray"


async def test_update_job_empty_cron_uses_default(monkeypatch: pytest.MonkeyPatch) -> None:
    """When the persisted cron is empty the registry default is re-persisted."""
    monkeypatch.setattr(cronjob_service, "CronTrigger", _FakeTrigger)
    calls: list[str] = []

    async def _upsert(_db: Any, *, key: str, cron_expression: str) -> Any:
        calls.append(cron_expression)
        return _config(cron_expression=cron_expression)

    async def _status(_db: Any, _table: str, _pk: int) -> Any:
        return SimpleNamespace(status=SimpleNamespace(name="active"))

    async def _get(_db: Any, _key: str) -> Any:
        return _config(cron_expression="")

    monkeypatch.setattr(cronjob_service, "upsert", _upsert)
    monkeypatch.setattr(cronjob_service, "get_core_status", _status)
    monkeypatch.setattr(cronjob_service, "get_by_key", _get)
    svc = CronJobService([_DEFN], {_DEFN.key: lambda: None})

    await svc.update_job(_db(), _DEFN.key, CronJobConfigUpdate(cron_expression=""), _FakeScheduler())

    assert calls == ["", _DEFN.default_cron]


# ── execute_now ──────────────────────────────────────────────────────────────


async def test_execute_now_awaits_coroutine_and_reports_next_run(monkeypatch: pytest.MonkeyPatch) -> None:
    """A coroutine job is awaited and the scheduler's next run time is persisted."""
    calls: list[int] = []
    recorded: list[tuple[str, Any]] = []

    async def _job() -> None:
        calls.append(1)

    async def _update(_db: Any, key: str, _now: Any, next_time: Any) -> None:
        recorded.append((key, next_time))

    async def _get(_db: Any, _key: str) -> Any:
        return _config()

    monkeypatch.setattr(cronjob_service, "update_run_timestamps", _update)
    monkeypatch.setattr(cronjob_service, "get_by_key", _get)
    svc = CronJobService([_DEFN], {_DEFN.key: _job})
    nxt = datetime(2024, 5, 1, tzinfo=UTC)
    sched = _FakeScheduler(job=SimpleNamespace(next_run_time=nxt))

    await svc.execute_now(_db(), _DEFN.key, cast(AsyncIOScheduler, sched))

    assert calls == [1]
    assert recorded == [(_DEFN.key, nxt)]


async def test_execute_now_runs_sync_job_in_executor(monkeypatch: pytest.MonkeyPatch) -> None:
    """A plain callable job runs off-loop and completes."""
    calls: list[int] = []

    async def _update(_db: Any, _key: str, _now: Any, _next: Any) -> None:
        return None

    async def _get(_db: Any, _key: str) -> Any:
        return _config()

    monkeypatch.setattr(cronjob_service, "update_run_timestamps", _update)
    monkeypatch.setattr(cronjob_service, "get_by_key", _get)
    svc = CronJobService([_DEFN], {_DEFN.key: lambda: calls.append(1)})

    await svc.execute_now(_db(), _DEFN.key, cast(AsyncIOScheduler, _FakeScheduler()))

    assert calls == [1]


async def test_execute_now_failure_truncates_error_message(monkeypatch: pytest.MonkeyPatch) -> None:
    """A failing job raises 500 with the error message truncated to 200 chars."""
    long_message = "z" * 300

    async def _boom() -> None:
        raise ValueError(long_message)

    async def _update(_db: Any, _key: str, _now: Any, _next: Any) -> None:
        return None

    async def _get(_db: Any, _key: str) -> Any:
        return _config()

    monkeypatch.setattr(cronjob_service, "update_run_timestamps", _update)
    monkeypatch.setattr(cronjob_service, "get_by_key", _get)
    svc = CronJobService([_DEFN], {_DEFN.key: _boom})

    with pytest.raises(HTTPException) as exc_info:
        await svc.execute_now(_db(), _DEFN.key, cast(AsyncIOScheduler, _FakeScheduler()))

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail.endswith(f"{'z' * 200}...")


async def test_execute_now_without_scheduler_job_persists_none(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without a live scheduler job the next run time is None."""
    recorded: list[Any] = []

    async def _update(_db: Any, _key: str, _now: Any, next_time: Any) -> None:
        recorded.append(next_time)

    async def _get(_db: Any, _key: str) -> Any:
        return _config()

    async def _job() -> None:
        return None

    monkeypatch.setattr(cronjob_service, "update_run_timestamps", _update)
    monkeypatch.setattr(cronjob_service, "get_by_key", _get)
    svc = CronJobService([_DEFN], {_DEFN.key: _job})

    await svc.execute_now(_db(), _DEFN.key, cast(AsyncIOScheduler, _FakeScheduler(job=None)))

    assert recorded == [None]


# ── listener ─────────────────────────────────────────────────────────────────


async def test_listener_persists_next_time_for_executed_event(monkeypatch: pytest.MonkeyPatch) -> None:
    """An EXECUTED event persists the scheduled run time as next run time."""
    recorded: list[tuple[str, Any]] = []

    async def _update(_db: Any, key: str, _now: Any, next_time: Any) -> None:
        recorded.append((key, next_time))

    monkeypatch.setattr(cronjob_service, "update_run_timestamps", _update)
    listener = CronJobService([_DEFN], {})._make_listener(cast(AsyncSession, object()))
    scheduled = datetime(2024, 6, 1, tzinfo=UTC)

    listener(SimpleNamespace(job_id=_DEFN.key, code=EVENT_JOB_EXECUTED, scheduled_run_time=scheduled))
    await asyncio.sleep(0)

    assert recorded == [(_DEFN.key, scheduled)]


async def test_listener_skips_event_without_job_id(monkeypatch: pytest.MonkeyPatch) -> None:
    """An event without a job id does not touch the database."""
    recorded: list[Any] = []

    async def _update(_db: Any, key: str, _now: Any, next_time: Any) -> None:
        recorded.append(key)

    monkeypatch.setattr(cronjob_service, "update_run_timestamps", _update)
    listener = CronJobService([_DEFN], {})._make_listener(cast(AsyncSession, object()))

    listener(SimpleNamespace(job_id=None, code=EVENT_JOB_EXECUTED, scheduled_run_time=None))
    await asyncio.sleep(0)

    assert recorded == []


async def test_listener_uses_none_next_time_for_error_event(monkeypatch: pytest.MonkeyPatch) -> None:
    """An ERROR event persists no next run time."""
    recorded: list[Any] = []

    async def _update(_db: Any, key: str, _now: Any, next_time: Any) -> None:
        recorded.append(next_time)

    monkeypatch.setattr(cronjob_service, "update_run_timestamps", _update)
    listener = CronJobService([_DEFN], {})._make_listener(cast(AsyncSession, object()))

    listener(
        SimpleNamespace(job_id=_DEFN.key, code=EVENT_JOB_ERROR, scheduled_run_time=datetime(2024, 6, 1, tzinfo=UTC))
    )
    await asyncio.sleep(0)

    assert recorded == [None]

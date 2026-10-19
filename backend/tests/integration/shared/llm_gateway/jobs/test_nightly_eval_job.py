"""Unit test for the scheduled nightly-eval job wrapper."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.shared.llm_gateway.jobs.nightly_eval_job import run_nightly_eval

pytestmark = pytest.mark.integration


class _FakeDb:
    """Session double whose ``scalar`` returns the configured active row."""

    def __init__(self, config: object | None) -> None:
        self._config = config

    async def scalar(self, statement: Any) -> object | None:
        return self._config


class _SessionContext:
    """Async context manager double yielding a fake session."""

    def __init__(self, db: _FakeDb) -> None:
        self._db = db

    async def __aenter__(self) -> _FakeDb:
        return self._db

    async def __aexit__(self, *exc: Any) -> bool:
        return False


def _install(monkeypatch: pytest.MonkeyPatch, *, active: bool) -> AsyncMock:
    """Wire a one-task registry and a fake evaluation service."""
    monkeypatch.setattr(
        "app.shared.llm_gateway.domain.task_registry_rules.TASK_REGISTRY",
        {"task_one": object()},
    )
    service = SimpleNamespace(run_gates=AsyncMock())
    monkeypatch.setattr(
        "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_evaluation_service",
        lambda: service,
    )
    config = object() if active else None
    monkeypatch.setattr(
        "app.shared.db_access.session.AsyncSessionLocal",
        lambda: _SessionContext(_FakeDb(config)),
    )
    return service.run_gates


async def test_run_nightly_eval_runs_gates_for_active_tasks(monkeypatch: pytest.MonkeyPatch) -> None:
    """An active production config triggers the evaluation gates."""
    run_gates = _install(monkeypatch, active=True)

    await run_nightly_eval()

    run_gates.assert_awaited_once()
    assert run_gates.call_args.args[1] == "task_one"


async def test_run_nightly_eval_skips_tasks_without_active_config(monkeypatch: pytest.MonkeyPatch) -> None:
    """A task without an active production config is skipped."""
    run_gates = _install(monkeypatch, active=False)

    await run_nightly_eval()

    run_gates.assert_not_awaited()

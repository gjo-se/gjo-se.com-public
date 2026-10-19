"""Integration tests for the observer background loop."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from app.shared.llm_gateway.dependencies import llm_gateway_dependencies as deps
from app.shared.llm_gateway.services.observer_runner_service import run_observer_loop


class _StopLoop(Exception):
    """Sentinel used to break the otherwise infinite observer loop."""


@pytest.mark.integration
async def test_loop_survives_a_failing_iteration_and_keeps_running(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An exception in one iteration is logged, not fatal, and the loop continues."""
    sleeps: list[int] = []
    observer_calls: list[Any] = []

    async def fake_sleep(seconds: int) -> None:
        sleeps.append(seconds)
        if len(sleeps) >= 2:
            raise _StopLoop

    def fake_get_observer(db: object) -> object:
        observer_calls.append(db)
        raise RuntimeError("iteration failed")

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(deps, "get_observer", fake_get_observer)

    with pytest.raises(_StopLoop):
        await run_observer_loop()

    assert len(observer_calls) == 1

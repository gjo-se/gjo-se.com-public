"""Integration tests for the latency gate 1d."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.gates.base import GateResult
from app.shared.llm_gateway.services.gates.latency_gate import LatencyGate


def _candidate() -> SimpleNamespace:
    """Return a minimal task-model-config double."""
    return SimpleNamespace(id=1, model_id=999_999, credential_id=1)


def _noop_factory(task_key: str) -> None:
    """Client factory that is never invoked in these tests."""
    return


@pytest.mark.integration
async def test_latency_gate_skips_without_a_production_baseline(db_session: AsyncSession) -> None:
    """Without a baseline the latency gate is skipped."""
    result = await LatencyGate(_noop_factory)._gate_latency(db_session, "description-merge", _candidate(), None, [])

    assert result.status == "skipped"


@pytest.mark.integration
async def test_latency_gate_passes_green_when_reusing_fast_client_timings(db_session: AsyncSession) -> None:
    """Reused client timings below the baseline yield the green tier."""
    previous = [GateResult(gate="client_latency", status="passed", score=1.0, details={"client_ms": [100, 100, 100]})]

    result = await LatencyGate(_noop_factory)._gate_latency(
        db_session, "description-merge", _candidate(), 200.0, previous
    )

    assert result.status == "passed"
    assert result.details["tier"] == "green"


@pytest.mark.integration
async def test_latency_gate_fails_red_when_candidate_exceeds_the_tolerance(db_session: AsyncSession) -> None:
    """Client timings well above the baseline fail the gate (red tier)."""
    previous = [GateResult(gate="client_latency", status="passed", score=1.0, details={"client_ms": [500, 500, 500]})]

    result = await LatencyGate(_noop_factory)._gate_latency(
        db_session, "description-merge", _candidate(), 200.0, previous
    )

    assert result.status == "failed"
    assert result.details["tier"] == "red"

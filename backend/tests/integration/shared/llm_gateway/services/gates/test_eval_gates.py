"""Integration tests for the evaluation gates (overhead, latency, regression)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.gates import eval_gates as eval_gates_module
from app.shared.llm_gateway.services.gates.base import GateResult
from app.shared.llm_gateway.services.gates.direct_overhead_gate import DirectOverheadGate
from app.shared.llm_gateway.services.gates.eval_gates import RegressionGate
from app.shared.llm_gateway.services.gates.latency_gate import LatencyGate


def _candidate() -> SimpleNamespace:
    """Return a minimal task-model-config double."""
    return SimpleNamespace(id=1, model_id=999_999, credential_id=1)


def _noop_factory(task_key: str) -> None:
    """Client factory that is never invoked in these tests."""
    return


@pytest.mark.integration
async def test_direct_overhead_gate_blocks_without_a_resolvable_model(db_session: AsyncSession) -> None:
    """An unresolvable candidate model blocks the overhead gate."""
    result = await DirectOverheadGate(_noop_factory)._gate_direct_overhead(
        db_session, "description-merge", _candidate()
    )

    assert result.status == "blocked"


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


@pytest.mark.integration
async def test_regression_gate_skips_when_langfuse_is_not_configured(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Without a LangFuse client the golden-regression gate is skipped."""

    async def _no_connect(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("no langfuse database")

    monkeypatch.setattr("asyncpg.connect", _no_connect)
    monkeypatch.setattr(eval_gates_module, "get_langfuse_client", lambda: None)

    result = await RegressionGate(_noop_factory)._gate_regression(db_session, "description-merge", _candidate())

    assert result.status == "skipped"

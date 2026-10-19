"""Integration tests for the evaluation orchestration service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.evaluation_service import EvaluationService
from app.shared.llm_gateway.services.gates.direct_overhead_gate import DirectOverheadGate
from app.shared.llm_gateway.services.gates.eval_gates import RegressionGate
from app.shared.llm_gateway.services.gates.latency_gate import LatencyGate
from app.shared.llm_gateway.services.model_config_service import ModelConfigService


def _dummy_client_factory(task_key: str) -> None:
    """Client factory that is never invoked in these tests."""
    return


def _service() -> EvaluationService:
    """Build an EvaluationService with un-wired client factories."""
    return EvaluationService(
        DirectOverheadGate(_dummy_client_factory),
        LatencyGate(_dummy_client_factory),
        RegressionGate(_dummy_client_factory),
        ModelConfigService,
    )


@pytest.mark.integration
async def test_run_gates_rejects_an_unknown_task(db_session: AsyncSession) -> None:
    """An unknown task key raises ValueError before any candidate runs."""
    with pytest.raises(ValueError, match="Unbekannter Task"):
        await _service().run_gates(db_session, "not-a-task", "manual")


@pytest.mark.integration
async def test_run_gates_returns_empty_without_candidates(db_session: AsyncSession) -> None:
    """A known task without configured candidates yields no runs."""
    runs = await _service().run_gates(db_session, "description-merge", "manual")

    assert runs == []

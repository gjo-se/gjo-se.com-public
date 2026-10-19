"""Restate activity for golden regression — LangFuse Experiments with LLM-as-Judge.

Runs a golden-dataset regression test via LangFuse Experiments
with LLM-as-Judge evaluation (self-judge guarded).
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_regression_gate
from app.shared.llm_gateway.services.gates.base import GateResult, _to_gate_result_dict
from app.shared.workflow_runtime.infrastructure.restate.activities.client_latency_activity import _load_candidate

logger = structlog.get_logger(__name__)

golden_regression_service = Service("GoldenRegression")


@golden_regression_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute golden regression test for a candidate.

    Includes self-judge guard: blocks when ``candidate.model_id`` equals
    the configured judge model.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``task_key`` (str) and ``candidate_id`` (int) keys.

    Returns:
        Serialized :class:`GateResult` dict with ``gate="golden_regression"``.
    """
    task_key: str = arg["task_key"]
    candidate_id: int = arg["candidate_id"]
    async with AsyncSessionLocal() as db:
        candidate = await _load_candidate(db, candidate_id)
        service = get_regression_gate()
        result: GateResult = await service._gate_regression(db, task_key, candidate)
        logger.info(
            "golden_regression: task=%s candidate_id=%d → %s (score=%.3f)",
            task_key,
            candidate_id,
            result.status,
            result.score,
        )
        return _to_gate_result_dict(result)

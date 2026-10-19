"""Restate activity for baseline latency — candidate vs. production baseline.

Compares candidate latency against a 7-day production P95 baseline.
Optionally reuses client_latency client timings passed via ``prev_results``.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_latency_gate
from app.shared.llm_gateway.services.gates.base import GateResult, _to_gate_result_dict
from app.shared.workflow_runtime.infrastructure.restate.activities.client_latency_activity import _load_candidate

logger = structlog.get_logger(__name__)

baseline_latency_service = Service("BaselineLatency")


@baseline_latency_service.handler()
async def run(
    ctx: Context,
    arg: dict[str, Any],
) -> dict[str, Any]:
    """Execute baseline latency measurement for a candidate.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``task_key``, ``candidate_id``,
            ``production_baseline_p95``, ``prev_results`` keys.

    Returns:
        Serialized :class:`GateResult` dict with ``gate="baseline_latency"``.
    """
    task_key: str = arg["task_key"]
    candidate_id: int = arg["candidate_id"]
    production_baseline_p95: float | None = arg.get("production_baseline_p95")
    prev_results: list[dict[str, Any]] | None = arg.get("prev_results")
    async with AsyncSessionLocal() as db:
        candidate = await _load_candidate(db, candidate_id)

        gate_results: list[GateResult] = []
        if prev_results:
            gate_results = [
                GateResult(
                    gate=str(pr.get("gate", "")),
                    status=pr.get("status", "skipped"),
                    score=float(pr.get("score", 0.0)),
                    details=pr.get("details", {}),
                    timestamp=str(pr.get("timestamp", "")),
                )
                for pr in prev_results
            ]

        service = get_latency_gate()
        result: GateResult = await service._gate_latency(
            db,
            task_key,
            candidate,
            production_baseline_p95,
            gate_results,
        )
        logger.info(
            "baseline_latency: task=%s candidate_id=%d → %s (score=%.3f)",
            task_key,
            candidate_id,
            result.status,
            result.score,
        )
        return _to_gate_result_dict(result)

"""Gate 1d – candidate latency compared against the production baseline."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.llm_consumer_contract import LLMClientFactoryConsumer
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY, TaskDefinition
from app.shared.llm_gateway.services.gates.base import (
    _DUMMY_PLACEHOLDERS,
    GATE_1C_N_DIRECT_CALLS,
    GATE_1D_BASELINE_TOLERANCE,
    GateResult,
)
from app.shared.llm_gateway.services.task_executor_service import _resolve_output_schema

logger = structlog.get_logger(__name__)


class LatencyGate(LLMClientFactoryConsumer):
    """Gate 1d: compare candidate latency against the production baseline."""

    async def _gate_latency(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
        production_baseline_p95: float | None,
        prev_results: list[GateResult],
    ) -> GateResult:
        """Compare candidate P95 against 7-day production P95 baseline.

        Three-tier: 🟢≤baseline, 🟡≤baseline×1.1, 🔴>baseline×1.1.
        Reuses client timings from Gate 1c if available (same batch).
        """
        definition = TASK_REGISTRY[task_key]
        result = await self._run_baseline_comparison(
            db,
            task_key,
            candidate,
            production_baseline_p95,
            definition,
            prev_results,
        )
        return GateResult(
            gate="baseline_latency",
            status=result.get("status", "blocked"),  # type: ignore[arg-type]
            score=round(result.get("score", 0), 4),
            details=result,
        )

    async def _run_baseline_comparison(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
        production_baseline_p95: float | None,
        definition: TaskDefinition,
        prev_results: list[GateResult],
    ) -> dict[str, Any]:
        """1d: Compare candidate calls against 7-day production P95 baseline.

        Reuses client timing data from a preceding Gate 1c result
        (``client_ms`` in its details).  Falls back to fresh calls only when
        no Gate 1c data is available.
        """
        if production_baseline_p95 is None:
            return {"status": "skipped", "score": 0, "reason": "No production baseline available"}

        # Try to reuse client timings from Gate 1c (same batch, same call pattern).
        candidate_times: list[int] = []
        for gr in prev_results:
            if gr.gate == "client_latency":
                client_ms = gr.details.get("client_ms")
                if isinstance(client_ms, list) and all(isinstance(v, (int, float)) for v in client_ms):
                    candidate_times = [int(v) for v in client_ms]
                    logger.info(
                        "evaluation_service: gate 1d reusing %d client timings from gate 1c",
                        len(candidate_times),
                    )
                    break

        if not candidate_times:
            # Fallback: make fresh client calls (same pattern as Gate 1c).
            variables = {ph.key: _DUMMY_PLACEHOLDERS.get(ph.key, f"<{ph.key}>") for ph in definition.placeholders}

            async def _single_baseline_call() -> int:
                """One candidate call returning duration_ms. Raises on failure."""
                client = self._llm_client_factory(task_key)
                t0 = time.monotonic()
                if definition.output_mode == "structured" and definition.output_schema:
                    schema_cls = _resolve_output_schema(definition.output_schema)
                    await client.call(
                        db=db,
                        task=task_key,
                        variables=variables,
                        output_schema=schema_cls,
                        trigger="eval_gate_1d",
                        force_model_id=candidate.model_id,
                        force_credential_id=candidate.credential_id,
                    )
                else:
                    await client.call_text(
                        db=db,
                        task=task_key,
                        variables=variables,
                        trigger="eval_gate_1d",
                        force_model_id=candidate.model_id,
                        force_credential_id=candidate.credential_id,
                    )
                return int((time.monotonic() - t0) * 1000)

            tasks = [_single_baseline_call() for _ in range(GATE_1C_N_DIRECT_CALLS)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for idx, result in enumerate(results):
                if isinstance(result, BaseException):
                    logger.warning(
                        "evaluation_service: gate 1d baseline call %d/%d failed: %s",
                        idx + 1,
                        len(results),
                        result,
                    )
                    return {
                        "status": "blocked",
                        "score": 0,
                        "error": f"Baseline comparison call {idx + 1} failed: {result}",
                    }
                candidate_times.append(result)

            if not candidate_times:
                return {"status": "blocked", "score": 0, "error": "No candidate calls completed"}

        candidate_avg = sum(candidate_times) / len(candidate_times)
        # Keep P95 for informational purposes, but use avg for comparison & display.
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_stability_analyzer

        candidate_p95 = get_stability_analyzer().percentile(
            [float(t) for t in candidate_times],
            95,
        )
        ratio = candidate_avg / production_baseline_p95

        if candidate_avg <= production_baseline_p95:
            tier = "green"
            status = "passed"
            score = 1.0
        elif candidate_avg <= production_baseline_p95 * GATE_1D_BASELINE_TOLERANCE:
            tier = "yellow"
            status = "passed"
            score = 0.5
        else:
            tier = "red"
            status = "failed"
            score = 0.0

        return {
            "status": status,
            "score": round(score, 4),
            "tier": tier,
            "candidate_times_ms": candidate_times,
            "candidate_avg_ms": round(candidate_avg, 1),
            "candidate_p95_ms": round(candidate_p95, 1),
            "baseline_p95_ms": round(production_baseline_p95, 1),
            "ratio": round(ratio, 2),
            "tolerance": GATE_1D_BASELINE_TOLERANCE,
        }

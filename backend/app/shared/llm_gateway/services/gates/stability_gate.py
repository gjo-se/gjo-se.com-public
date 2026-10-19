"""Gate 2a – run N parallel calls and compute stability metrics."""

from __future__ import annotations

import asyncio
import time

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.llm_consumer_contract import LLMClientFactoryConsumer
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.services.gates.base import (
    _DUMMY_PLACEHOLDERS,
    GATE_1E_LATENCY_CV_MAX,
    GATE_1E_N_CALLS,
    GATE_1E_SIMILARITY_MIN,
    GATE_1E_SUCCESS_RATE_MIN,
    GATE_1E_TOKEN_CV_MAX,
    GateResult,
    _run_candidate_call,
)
from app.shared.llm_gateway.services.stability_analyzer_service import StabilityResult

logger = structlog.get_logger(__name__)


class StabilityGate(LLMClientFactoryConsumer):
    """Gate 2a: run N parallel calls and compute stability metrics."""

    async def _gate_stability(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
    ) -> GateResult:
        """Execute N parallel calls using the candidate's model and compute stability metrics."""
        definition = TASK_REGISTRY[task_key]
        variables = {ph.key: _DUMMY_PLACEHOLDERS.get(ph.key, f"<{ph.key}>") for ph in definition.placeholders}

        async def _single_call() -> StabilityResult:
            """Execute one stability sample against the candidate model.

            Returns:
                The latency and output of this single call.
            """
            started = time.monotonic()
            try:
                output_text = await _run_candidate_call(
                    db, task_key, candidate, definition, variables, self._llm_client_factory
                )
                duration_ms = int((time.monotonic() - started) * 1000)
                return StabilityResult(
                    success=True,
                    duration_ms=duration_ms,
                    output_text=output_text,
                    token_count=0,
                )
            except Exception:
                duration_ms = int((time.monotonic() - started) * 1000)
                logger.exception(
                    "evaluation_service: gate 1d call failed for task '%s' candidate %d",
                    task_key,
                    candidate.id,
                )
                return StabilityResult(
                    success=False,
                    duration_ms=duration_ms,
                    output_text="",
                    token_count=0,
                )

        tasks_coro = [_single_call() for _ in range(GATE_1E_N_CALLS)]
        results = await asyncio.gather(*tasks_coro)

        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_stability_analyzer

        metrics = get_stability_analyzer().analyze_stability(results)

        all_passed = (
            metrics.success_rate >= GATE_1E_SUCCESS_RATE_MIN
            and metrics.output_similarity >= GATE_1E_SIMILARITY_MIN
            and metrics.latency_cv <= GATE_1E_LATENCY_CV_MAX
            and metrics.token_cv <= GATE_1E_TOKEN_CV_MAX
        )

        sub_scores = [
            min(1.0, metrics.success_rate / GATE_1E_SUCCESS_RATE_MIN),
            min(1.0, metrics.output_similarity / GATE_1E_SIMILARITY_MIN),
            min(1.0, GATE_1E_LATENCY_CV_MAX / max(metrics.latency_cv, 0.01)),
            min(1.0, GATE_1E_TOKEN_CV_MAX / max(metrics.token_cv, 0.01)),
        ]
        score = sum(sub_scores) / len(sub_scores)

        return GateResult(
            gate="2a",
            status="passed" if all_passed else "failed",
            score=round(score, 4),
            details={
                "success_rate": metrics.success_rate,
                "output_similarity": metrics.output_similarity,
                "latency_cv": metrics.latency_cv,
                "token_cv": metrics.token_cv,
                "latency_p50_ms": metrics.latency_p50_ms,
                "latency_p95_ms": metrics.latency_p95_ms,
                "sample_size": metrics.sample_size,
                "thresholds": {
                    "success_rate_min": GATE_1E_SUCCESS_RATE_MIN,
                    "similarity_min": GATE_1E_SIMILARITY_MIN,
                    "latency_cv_max": GATE_1E_LATENCY_CV_MAX,
                    "token_cv_max": GATE_1E_TOKEN_CV_MAX,
                },
            },
        )

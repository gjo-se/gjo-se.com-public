"""Evaluation service – orchestrates the gate suite for LLM task candidates.

Evaluates every active model config for a task. Gate implementations live in the
``gates`` package; see ``evaluation_service.gates``. The DB access lives in
:mod:`...repositories.call_log_repository` / ``eval_run_repository``.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.eval_run_contract import EvalRunRecord
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.repositories import call_log_repository, eval_run_repository
from app.shared.llm_gateway.services.gates.base import (
    _GATE_1D_HISTORY_MIN_SAMPLES,
    GATE_1D_HISTORY_DAYS,
    GateResult,
    _compute_overall_status,
    _to_gate_result_dict,
)
from app.shared.llm_gateway.services.gates.direct_overhead_gate import DirectOverheadGate
from app.shared.llm_gateway.services.gates.eval_gates import RegressionGate
from app.shared.llm_gateway.services.gates.latency_gate import LatencyGate
from app.shared.llm_gateway.services.gates.outlier_filter import _remove_outliers_iqr
from app.shared.llm_gateway.services.model_config_service import ModelConfigService

logger = structlog.get_logger(__name__)


class EvaluationService:
    """Orchestrates the gate suite for LLM task candidates.

    Each candidate model config is evaluated independently. If a gate returns
    ``"blocked"``, subsequent gates are skipped for that candidate. The gate
    implementations live in dedicated single-responsibility collaborators (see
    above).
    """

    def __init__(
        self,
        direct_overhead_gate: DirectOverheadGate,
        latency_gate: LatencyGate,
        regression_gate: RegressionGate,
        model_config_service_factory: Callable[[AsyncSession], ModelConfigService],
    ) -> None:
        """Wire the evaluation gate collaborators."""
        self._direct_overhead = direct_overhead_gate
        self._latency = latency_gate
        self._regression = regression_gate
        self._model_config_service_factory = model_config_service_factory

    async def run_gates(
        self,
        db: AsyncSession,
        task_key: str,
        trigger: str,
    ) -> list[EvalRunRecord]:
        """Execute all gates for every active candidate and persist the runs.

        Args:
            db: Active async database session.
            task_key: Task identifier from ``TASK_REGISTRY``.
            trigger: What triggered this run (e.g. ``"manual"``).

        Returns:
            List of persisted evaluation-run records, one per candidate.

        Raises:
            ValueError: *task_key* is not in ``TASK_REGISTRY``.
        """
        if task_key not in TASK_REGISTRY:
            raise ValueError(f"Unbekannter Task: '{task_key}'")

        config_service = self._model_config_service_factory(db)
        candidates = await config_service.list_by_task(task_key)
        # Only evaluate active candidates (is_active=true).
        candidates = list(candidates)  # all configs are active (core_statusable)

        if not candidates:
            logger.info(
                "evaluation_service: no active candidates for task '%s'",
                task_key,
            )
            return []

        # Compute the production-history baseline once per task.
        production_baseline_p95 = await self._compute_history_baseline(db, task_key)

        batch_id = str(uuid.uuid4())

        # Run each candidate in parallel with its own DB session.
        logger.info(
            "evaluation_service: firing %d candidate(s) in parallel for task '%s'",
            len(candidates),
            task_key,
        )
        runs = list(
            await asyncio.gather(
                *[
                    self._eval_candidate(session_candidate, task_key, trigger, production_baseline_p95, batch_id)
                    for session_candidate in candidates
                ]
            )
        )

        logger.info(
            "evaluation_service: run_gates complete – task='%s' candidates=%d",
            task_key,
            len(runs),
        )
        return runs

    async def _eval_candidate(
        self,
        candidate: TaskModelConfigRecord,
        task_key: str,
        trigger: str,
        production_baseline_p95: float | None,
        batch_id: str,
    ) -> EvalRunRecord:
        """Evaluate one candidate in a dedicated DB session.

        Args:
            candidate: Model config under evaluation.
            task_key: Task identifier from ``TASK_REGISTRY``.
            trigger: What triggered this run.
            production_baseline_p95: Pre-computed production baseline (or ``None``).
            batch_id: Shared UUID grouping all candidates of this run.

        Returns:
            The persisted eval run for the candidate.
        """
        async with eval_run_repository.open_sample_session() as session:
            return await self._run_gates_for_candidate(
                session,
                task_key,
                trigger,
                candidate,
                production_baseline_p95,
                batch_id,
            )

    async def _run_gates_for_candidate(
        self,
        db: AsyncSession,
        task_key: str,
        trigger: str,
        candidate: TaskModelConfigRecord,
        production_baseline_p95: float | None,
        batch_id: str,
    ) -> EvalRunRecord:
        """Run all gates for a single candidate model config."""
        logger.info(
            "run_gates_for_candidate: task=%s candidate_id=%d model_id=%d batch=%s",
            task_key,
            candidate.id,
            candidate.model_id,
            batch_id[:8],
        )
        run = await eval_run_repository.create_running(
            db,
            task=task_key,
            model_config_id=candidate.id,
            batch_id=batch_id,
            trigger=trigger,
            reviewer="REX",
        )

        gate_results: list[GateResult] = []
        blocked = False

        gate_factories: list[tuple[str, Any]] = [
            # ("1a", self._gate_contract),          -- CI Gate
            # ("1b", self._gate_schema),             -- CI Gate
            ("client_latency", self._direct_overhead._gate_direct_overhead),  # Eval Gate
            ("baseline_latency", self._latency._gate_latency),  # Eval Gate
            ("golden_regression", self._regression._gate_regression),  # Eval Gate – Golden Regression
            # ("2a", self._gate_stability),         -- Obs Gate, continuous via Observer
            # ("2b", self._gate_audit),             -- Obs Gate, continuous via Observer
        ]

        for gate_id, gate_fn in gate_factories:
            if blocked:
                gate_results.append(
                    GateResult(
                        gate=gate_id,
                        status="skipped",
                        score=0,
                        details={"reason": "previous gate blocked"},
                    )
                )
                continue

            try:
                if gate_id == "baseline_latency":
                    result = await gate_fn(db, task_key, candidate, production_baseline_p95, gate_results)
                elif gate_id in ("client_latency", "golden_regression"):
                    result = await gate_fn(db, task_key, candidate)
                else:
                    result = await gate_fn(db, task_key)
            except Exception as exc:
                logger.exception(
                    "evaluation_service: gate %s crashed for task '%s' candidate %d",
                    gate_id,
                    task_key,
                    candidate.id,
                )
                result = GateResult(
                    gate=gate_id,
                    status="blocked",
                    score=0,
                    details={"error": str(exc)},
                )

            gate_results.append(result)
            if result.status == "blocked":
                blocked = True

        final = await eval_run_repository.finalize(
            db,
            run.id,
            gate_results=[_to_gate_result_dict(gr) for gr in gate_results],
            overall_status=_compute_overall_status(gate_results),
        )

        logger.info(
            "evaluation_service: candidate %d complete – status=%s gates=%d",
            candidate.id,
            final.overall_status,
            len(gate_results),
        )
        return final

    async def _compute_history_baseline(
        self,
        db: AsyncSession,
        task_key: str,
    ) -> float | None:
        """Compute P95 latency from 7-day production call-log history.

        Filters successful calls with ``duration_ms IS NOT NULL``, removes
        outliers via IQR (Q3 + 1.5 × IQR), and returns the P95 of the
        cleaned sample.

        Returns ``None`` if fewer than :data:`_GATE_1D_HISTORY_MIN_SAMPLES`
        calls exist.
        """
        cutoff = datetime.now(UTC) - timedelta(days=GATE_1D_HISTORY_DAYS)

        durations = await call_log_repository.list_recent_durations(db, task=task_key, since=cutoff)
        if len(durations) < _GATE_1D_HISTORY_MIN_SAMPLES:
            logger.info(
                "evaluation_service: insufficient history (%d samples) for task '%s'",
                len(durations),
                task_key,
            )
            return None

        # IQR outlier removal.
        cleaned = _remove_outliers_iqr([float(d) for d in durations])

        if len(cleaned) < _GATE_1D_HISTORY_MIN_SAMPLES:
            cleaned = [float(d) for d in durations]

        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_stability_analyzer

        p95 = get_stability_analyzer().percentile(cleaned, 95)
        logger.info(
            "evaluation_service: baseline for '%s' – p95=%.0f ms (n=%d/%d)",
            task_key,
            p95,
            len(cleaned),
            len(durations),
        )
        return p95

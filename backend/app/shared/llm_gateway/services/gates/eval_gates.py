"""Evaluation gate 1e: golden-dataset regression via LangFuse experiments.

The direct-overhead (1c) and latency (1d) gates live in their own modules
(``direct_overhead_gate`` / ``latency_gate``). The LangFuse-judge lookup lives in
:mod:`...repositories.judge_model_repository`.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog

from app.shared.config.config import settings
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.llm_consumer_contract import LLMClientFactoryConsumer
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY, TaskDefinition
from app.shared.llm_gateway.langfuse_client import get_langfuse_client
from app.shared.llm_gateway.repositories import judge_model_repository
from app.shared.llm_gateway.services.gates.base import (
    _DUMMY_PLACEHOLDERS,
    GOLDEN_REGRESSION_MIN_ITEMS,
    GOLDEN_REGRESSION_MIN_SCORE,
    GateResult,
    _run_candidate_call,
)

if TYPE_CHECKING:
    from langfuse import Evaluation

logger = structlog.get_logger(__name__)


class RegressionGate(LLMClientFactoryConsumer):
    """Gate 1e: golden-dataset regression via LangFuse experiments."""

    async def _gate_regression(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
    ) -> GateResult:
        """Golden-dataset regression via LangFuse Experiments (``{task_key}-golden``)."""
        definition = TASK_REGISTRY[task_key]

        # ── Self-Judge-Guard (SSOT: LangFuse) ────────────────────────────
        judge_model_id = await self._get_langfuse_judge_model_id(db)
        if judge_model_id is not None and candidate.model_id == judge_model_id:
            logger.warning(
                "evaluation_service: gate 1e self-judge blocked for task '%s' candidate %d",
                task_key,
                candidate.id,
            )
            return GateResult(
                gate="golden_regression",
                status="skipped",
                score=0,
                details={"reason": "Self-judging not allowed – candidate is the judge model"},
            )

        result = await self._run_golden_regression(
            db,
            task_key,
            candidate,
            definition,
        )
        return GateResult(
            gate="golden_regression",
            status=result.get("status", "blocked"),
            score=round(result.get("score", 0), 4),
            details=result,
        )

    async def _get_langfuse_judge_model_id(
        self,
        db: AsyncSession,
    ) -> int | None:
        """Return our internal model_id for the LangFuse-configured Judge model."""
        return await judge_model_repository.get_judge_internal_model_id(db, settings.LANGFUSE_PROJECT_ID)

    async def _run_golden_regression(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
        definition: TaskDefinition,
    ) -> dict[str, Any]:
        """Golden-dataset regression via LangFuse Experiments.

        Uses ``dataset.run_experiment()`` (LangFuse SDK v3+) to run the
        candidate model on every item in the ``{task_key}-golden`` dataset.
        A bundled evaluator computes a ``gjo-correctness`` score per item
        (simple keyword-overlap heuristic; full LLM-as-Judge scoring is
        provided by the ``gjo-correctness`` Custom Evaluator in the LangFuse UI).
        """
        dataset_name = f"{task_key}-golden"

        # ── Dataset existence check ──────────────────────────────────────
        langfuse_raw = get_langfuse_client()
        if langfuse_raw is None:
            return {"status": "skipped", "score": 0, "reason": "LangFuse not configured"}
        try:
            dataset = langfuse_raw.get_dataset(dataset_name)
            items = list(dataset.items)
        except Exception:
            logger.exception(
                "evaluation_service: gate 1e dataset '%s' not found",
                dataset_name,
            )
            return {"status": "skipped", "score": 0, "reason": f"No golden dataset: {dataset_name}"}

        if not items:
            return {
                "status": "skipped",
                "score": 0,
                "reason": "Golden dataset is empty",
                "dataset_name": dataset_name,
            }

        if len(items) < GOLDEN_REGRESSION_MIN_ITEMS:
            return {
                "status": "skipped",
                "score": 0,
                "reason": f"Golden dataset has only {len(items)} item(s) – need at least {GOLDEN_REGRESSION_MIN_ITEMS}",
                "dataset_name": dataset_name,
                "item_count": len(items),
            }

        # ── Judge config (SSOT: LangFuse) ────────────────────────────────
        judge_model_id = await self._get_langfuse_judge_model_id(db)
        if judge_model_id is None:
            logger.warning(
                "evaluation_service: gate 1e no judge configured in LangFuse",
            )
            return {
                "status": "skipped",
                "score": 0,
                "reason": (
                    "No judge configured in LangFuse – configure a Default LLM Model and gjo-correctness evaluator"
                ),
                "dataset_name": dataset_name,
                "item_count": len(items),
            }

        # ── Judge evaluator (LLM-as-Judge via our LLMClient) ─────────────
        from langfuse import Evaluation

        async def gjo_judge_evaluator(
            *,
            input: object,
            output: object,
            expected_output: object,
            **kwargs: Any,
        ) -> Evaluation:
            """LLM-as-Judge: Judge model bewertet output vs expected_output."""
            if not expected_output or not output:
                return Evaluation(name="gjo-correctness", value=0.0, comment="Empty output")

            judge_prompt = (
                "Bewerte die Kandidaten-Antwort gegen die erwartete Antwort:\n\n"
                "- Korrektheit (0-4): Stimmen die Fakten, Kernaussagen und Details?\n"
                "- Relevanz (0-3): Ist die Antwort thematisch passend?\n"
                "- Form/Struktur (0-3): Formatierung, Stil, Lesbarkeit?\n\n"
                f"Erwartete Antwort:\n{str(expected_output)[:2000]}\n\n"
                f"Kandidaten-Antwort:\n{str(output)[:2000]}\n\n"
                "Gib NUR eine Zahl zwischen 0.0 und 1.0 zurück (Summe/10)."
            )
            try:
                client = self._llm_client_factory(task_key)
                score_text = await client.call_text(
                    db=db,
                    task=task_key,
                    variables={"input": judge_prompt},
                    force_model_id=judge_model_id,
                    trigger="eval_gate_golden_judge",
                )
                score = float(score_text.strip())
                return Evaluation(
                    name="gjo-correctness",
                    value=round(max(0.0, min(1.0, score)), 4),
                )
            except Exception:
                logger.exception("Judge evaluator failed – falling back to keyword overlap")
                exp_words = set(str(expected_output).lower().split())
                out_words = set(str(output).lower().split())
                if not exp_words:
                    return Evaluation(name="gjo-correctness", value=1.0)
                overlap = len(exp_words & out_words) / len(exp_words)
                return Evaluation(
                    name="gjo-correctness",
                    value=round(min(overlap * 1.5, 1.0), 4),
                )

        # ── Task function (called by run_experiment for each item) ───────
        async def regression_task(*, item: object, **kwargs: Any) -> str:
            """Execute the candidate model on one dataset item."""
            item_input = getattr(item, "input", None) or {}
            variables = {
                ph.key: item_input.get(ph.key, _DUMMY_PLACEHOLDERS.get(ph.key, f"<{ph.key}>"))
                for ph in definition.placeholders
            }

            return await _run_candidate_call(
                db,
                task_key,
                candidate,
                definition,
                variables,
                self._llm_client_factory,
                trigger="eval_gate_golden_candidate",
            )

        # ── Run experiment via LangFuse SDK ──────────────────────────────
        logger.info(
            "evaluation_service: gate 1e running experiment '%s' with %d items",
            dataset_name,
            len(items),
        )
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_langfuse_service

        result = await get_langfuse_service().run_experiment(
            dataset_name=dataset_name,
            task_function=regression_task,
            evaluators=[gjo_judge_evaluator],
            experiment_name=f"{task_key}-golden-regression",
            experiment_description=f"Golden regression for task '{task_key}' with model {candidate.model_id}",
            task_metadata={
                "task_key": task_key,
                "candidate_model_id": str(candidate.model_id),
                "gate": "golden_regression",
            },
            max_concurrency=5,
        )

        if result is None:
            return {
                "status": "failed",
                "score": 0,
                "reason": "Experiment execution failed",
                "dataset_name": dataset_name,
                "item_count": len(items),
            }

        # ── Compute pass/fail ────────────────────────────────────────────
        avg_score = result.get("avg_score", 0.0)
        passed = avg_score >= GOLDEN_REGRESSION_MIN_SCORE

        return {
            "status": "passed" if passed else "failed",
            "score": round(avg_score, 4),
            "dataset_name": dataset_name,
            "item_count": result.get("item_count", len(items)),
            "avg_score": round(avg_score, 4),
            "threshold": GOLDEN_REGRESSION_MIN_SCORE,
            "item_results": result.get("item_results", []),
            "dataset_run_id": result.get("dataset_run_id"),
            "experiment_id": result.get("experiment_id"),
        }

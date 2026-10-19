"""BatchEvalWorkflow — Fan-Out über alle aktiven Kandidaten eines Tasks.

Startet für jeden aktiven Kandidaten einen ``CandidateEvalWorkflow``
parallel via ``ctx.generic_call`` und wartet auf alle Ergebnisse.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from restate import Context, Workflow
from restate import gather as restate_gather

logger = structlog.get_logger(__name__)

batch_eval_workflow = Workflow("BatchEvalWorkflow")


@batch_eval_workflow.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> list[dict[str, Any]]:
    """Fan-out CandidateEvalWorkflow for all active candidates of a task.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``task_key`` (str) and ``trigger`` (str) keys.

    Returns:
        List of ``{"eval_run_id": int, "candidate_id": int, "status": str}``
        dictionaries, one per candidate.
    """
    task_key: str = arg["task_key"]
    trigger: str = arg["trigger"]

    from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY

    if task_key not in TASK_REGISTRY:
        raise ValueError(f"Unknown task_key: {task_key}")

    # ── Load candidates + compute baseline via ctx.run() for determinism ──
    result = await ctx.run("load candidates and baseline", _load_batch_context, args=(task_key,))
    candidates: list[dict[str, Any]] = result["candidates"]
    production_baseline_p95: float | None = result["production_baseline_p95"]
    batch_id: str = result["batch_id"]

    if not candidates:
        logger.info("BatchEvalWorkflow: no active candidates for task=%s", task_key)
        return []
    logger.info(
        "BatchEvalWorkflow: fan-out %d candidates for task=%s batch=%s",
        len(candidates),
        task_key,
        batch_id,
    )

    # ── Fan-out: start one CandidateEvalWorkflow per candidate ──────────────
    futures = []
    for candidate in candidates:
        arg_bytes = json.dumps(
            {
                "task_key": task_key,
                "candidate_id": candidate["id"],
                "trigger": trigger,
                "production_baseline_p95": production_baseline_p95,
                "batch_id": batch_id,
            }
        ).encode("utf-8")

        future = ctx.generic_call(
            service="CandidateEvalWorkflow",
            handler="run",
            arg=arg_bytes,
            key=str(candidate["id"]),
        )
        futures.append((candidate["id"], future))

    results: list[dict[str, Any]] = []
    raw_futures: list[Any] = await restate_gather(*[f for _, f in futures])

    for (candidate_id, _future), raw_result in zip(futures, raw_futures, strict=False):
        try:
            parsed = json.loads(raw_result) if isinstance(raw_result, bytes) else raw_result
            results.append(
                {
                    "candidate_id": candidate_id,
                    "eval_run_id": parsed.get("eval_run_id"),
                    "status": parsed.get("overall_status", "unknown"),
                }
            )
        except Exception as exc:
            logger.exception(
                "BatchEvalWorkflow: failed to parse result for candidate_id=%d",
                candidate_id,
            )
            results.append(
                {
                    "candidate_id": candidate_id,
                    "eval_run_id": None,
                    "status": "error",
                    "error": str(exc),
                }
            )

    logger.info(
        "BatchEvalWorkflow: completed %d/%d candidates for task=%s",
        len(results),
        len(candidates),
        task_key,
    )
    return results


# ── Side-effect helpers (called via ctx.run() for determinism) ──────────────


async def _load_batch_context(task_key: str) -> dict[str, Any]:
    """Load active candidates + compute production baseline + generate batch ID.

    Must be called via ``ctx.run()`` so Restate journals the result.
    """
    from app.shared.db_access.session import AsyncSessionLocal
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import (
        get_evaluation_service,
        get_model_config_service_factory,
    )

    async with AsyncSessionLocal() as db:
        config_service = get_model_config_service_factory()(db)
        all_candidates = await config_service.list_by_task(task_key)
        active = list(all_candidates)  # all configs are active (core_statusable)

        eval_service = get_evaluation_service()
        production_baseline_p95 = await eval_service._compute_history_baseline(db, task_key)

    candidates = [{"id": c.id, "task": c.task} for c in active]

    return {
        "candidates": candidates,
        "production_baseline_p95": production_baseline_p95,
        "batch_id": str(uuid.uuid4()),
    }

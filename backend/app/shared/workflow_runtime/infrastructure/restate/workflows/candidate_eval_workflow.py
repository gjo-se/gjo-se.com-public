"""CandidateEvalWorkflow — sequentielle Gate-Pipeline für einen LLM-Kandidaten.

Führt die Gates contract_validation → schema_validation → 1c → 1d → 1e
via ``ctx.generic_call`` aus. Jeder Service-Aufruf verwendet ``key=None``.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

import structlog
from restate import Context, Workflow

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.models.eval_run import EvalRun

logger = structlog.get_logger(__name__)

candidate_eval_workflow = Workflow("CandidateEvalWorkflow")


@candidate_eval_workflow.handler()
async def run(
    ctx: Context,
    arg: dict[str, Any],
) -> dict[str, Any]:
    """Run the sequential gate pipeline for one LLM candidate.

    Creates an :class:`EvalRun` row, executes the gates
    (contract → schema → client latency → baseline latency → golden
    regression) in order, and persists the aggregated result. Once a gate
    blocks, the remaining gates are recorded as ``skipped``.

    Args:
        ctx: Restate workflow context used for the generic gate calls.
        arg: Handler payload with ``task_key``, ``candidate_id``, ``trigger``
            and optionally ``production_baseline_p95`` / ``batch_id``.

    Returns:
        A mapping with the created ``eval_run_id`` and the computed
        ``overall_status``.
    """
    task_key: str = arg["task_key"]
    candidate_id: int = arg["candidate_id"]
    trigger: str = arg["trigger"]
    production_baseline_p95: float | None = arg.get("production_baseline_p95")
    batch_id: str = arg.get("batch_id", "")

    # ── Create EvalRun ───────────────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        run = EvalRun(
            task=task_key,
            model_config_id=candidate_id,
            batch_id=batch_id,
            trigger=trigger,
            gate_results=[],
            overall_status="running",
            reviewer="REX",
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        run_id: int = run.id

    gate_results: list[dict[str, Any]] = []
    arg_str = json.dumps(task_key).encode("utf-8")
    arg_gate = json.dumps({"task_key": task_key, "candidate_id": candidate_id}).encode("utf-8")
    context = f"task_key={task_key}"

    blocked = await _run_gate(
        ctx,
        name="contract_validation",
        service="ContractValidation",
        arg=arg_str,
        context=context,
        gate_results=gate_results,
        blocked=False,
    )
    blocked = await _run_gate(
        ctx,
        name="schema_validation",
        service="SchemaValidation",
        arg=arg_str,
        context=context,
        gate_results=gate_results,
        blocked=blocked,
    )
    blocked = await _run_gate(
        ctx,
        name="client_latency",
        service="ClientLatency",
        arg=arg_gate,
        context=context,
        gate_results=gate_results,
        blocked=blocked,
    )
    arg_1d = json.dumps(
        {
            "task_key": task_key,
            "candidate_id": candidate_id,
            "production_baseline_p95": production_baseline_p95,
            "prev_results": gate_results,
        }
    ).encode("utf-8")
    blocked = await _run_gate(
        ctx,
        name="baseline_latency",
        service="BaselineLatency",
        arg=arg_1d,
        context=context,
        gate_results=gate_results,
        blocked=blocked,
    )
    await _run_gate(
        ctx,
        name="golden_regression",
        service="GoldenRegression",
        arg=arg_gate,
        context=context,
        gate_results=gate_results,
        blocked=blocked,
    )

    # ── Finalise ────────────────────────────────────────────────────────────
    overall = _compute_overall(gate_results)
    async with AsyncSessionLocal() as db:
        run = await db.get(EvalRun, run_id)
        if run is not None:
            run.gate_results = gate_results
            run.overall_status = overall
            await db.commit()

    logger.info("CandidateEvalWorkflow: candidate_id=%d → %s", candidate_id, overall)
    return {"eval_run_id": run_id, "overall_status": overall}


# ── Helpers ─────────────────────────────────────────────────────────────────


async def _run_gate(
    ctx: Context,
    *,
    name: str,
    service: str,
    arg: bytes,
    context: str,
    gate_results: list[dict[str, Any]],
    blocked: bool,
) -> bool:
    """Run one eval gate (skip if already blocked); append its result and return the blocked flag."""
    if blocked:
        gate_results.append(_skipped(name))
        return True
    try:
        logger.info("CandidateEval: starting %s (%s)", name, context)
        result_bytes = await ctx.generic_call(service=service, handler="run", arg=arg, key=None)
        result = json.loads(result_bytes)
        gate_results.append(result)
        logger.info("%s: %s → %s", name, context, result.get("status"))
        return bool(result.get("status") in ("blocked", "failed"))
    except Exception as exc:
        logger.exception("%s crashed (%s)", name, context)
        gate_results.append(_blocked(name, str(exc)))
        return True


def _blocked(gate: str, error: str) -> dict[str, Any]:
    """Build a ``blocked`` gate result carrying the failure reason.

    Args:
        gate: Name of the gate that blocked or crashed.
        error: Human-readable error message.

    Returns:
        Gate-result mapping with status ``blocked`` and score ``0.0``.
    """
    return {
        "gate": gate,
        "status": "blocked",
        "score": 0.0,
        "details": {"error": error},
        "timestamp": datetime.now(UTC).isoformat(),
    }


def _skipped(gate: str) -> dict[str, Any]:
    """Build a ``skipped`` gate result for a gate not reached after a block.

    Args:
        gate: Name of the gate that was skipped.

    Returns:
        Gate-result mapping with status ``skipped`` and score ``0.0``.
    """
    return {
        "gate": gate,
        "status": "skipped",
        "score": 0.0,
        "details": {"reason": "previous gate blocked"},
        "timestamp": datetime.now(UTC).isoformat(),
    }


def _compute_overall(gate_results: list[dict[str, Any]]) -> str:
    """Aggregate gate results into one overall status.

    Precedence is ``blocked`` > ``failed`` > ``passed``; if every gate was
    skipped the outcome defaults to ``passed``.

    Args:
        gate_results: Per-gate result mappings.

    Returns:
        The overall status string (``blocked``, ``failed`` or ``passed``).
    """
    statuses = {gr.get("status", "skipped") for gr in gate_results if gr.get("status") != "skipped"}
    if "blocked" in statuses:
        return "blocked"
    if "failed" in statuses:
        return "failed"
    if "passed" in statuses:
        return "passed"
    return "passed"

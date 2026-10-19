"""EndCustomerResearchWorkflow – sequentielle Endkunden-Recherche (Acts 1-8).

Orchestriert die 8 Phasen der Endkunden-Recherche-Pipeline:
  Act 1 → Act 2 → … → Act 8

Jede Activity läuft als Restate Service-Invocation via ``ctx.generic_call``
mit eigener DB-Session und ohne Event-Loop-Konflikte. Fehler in einem Act
führen zum Abbruch mit ``phase="failed"``.

Per-Act Progress Tracking:
  Vor jedem Act wird ein Call-Log (``task="endcustomer-pipeline"``,
  ``phase="Act N"``, ``success=None``) geschrieben. Nach Abschluss wird der
  Eintrag auf ``success=True`` oder ``success=False`` aktualisiert.

Stop-After-Act:
  Wenn ``arg["stop_after_act"]`` gesetzt ist, stoppt der Workflow nach dem
  angegebenen Act und gibt den bis dahin akkumulierten ``pipeline_state``
  zurück (``phase="stopped"``).
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from enum import IntEnum
from typing import Any

import structlog
from restate import Workflow, WorkflowContext

from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.workflow_runtime.dependencies.workflow_runtime_dependencies import get_act_tracker
from app.shared.workflow_runtime.infrastructure.restate.activity_call import call_activity

logger = structlog.get_logger(__name__)

endcustomer_research_workflow = Workflow("EndCustomerResearchWorkflow")


class Act(IntEnum):
    """Die acht Phasen der Endkunden-Recherche (Reihenfolge = Ausführung)."""

    START = 1
    SIGNALS = 2
    WEB_SEARCH = 3
    SNIPPET_FILTER = 4
    PAGE_FETCH = 5
    EMBEDDING = 6
    EVALUATION = 7
    FUSION = 8


# ── Act metadata ────────────────────────────────────────────────────────────────

_ACT_NAMES: dict[int, str] = {
    1: "Start",
    2: "Signal Extraction",
    3: "Web Search",
    4: "Snippet Filter",
    5: "Page Fetch",
    6: "Embedding",
    7: "LLM Evaluation",
    8: "Fusion",
}


def _build_act_result(
    act: int,
    duration_ms: int,
    result: dict[str, Any] | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    """Build a ``PipelineActResultOut``-compatible dict for one act.

    Args:
        act: Act number (1-8).
        duration_ms: Wall-clock duration in ms.
        result: The activity's return dict (used for ``data`` + ``summary``).
        error: Error message if the act failed.

    Returns:
        A dict matching ``PipelineActResultOut`` for serialization.
    """
    status: str = "failed" if error else "done"
    act_result: dict[str, Any] = {
        "act": act,
        "name": _ACT_NAMES.get(act, f"Act {act}"),
        "status": status,
        "duration_ms": duration_ms,
        "summary": "",
        "data": {},
        "call_log_id": None,
        "error": error,
    }
    if result:
        act_result["data"] = {k: v for k, v in result.items() if k not in ("project_id",)}
        # Extract call_log_id if present (Act 2, Act 3, Act 7)
        if "call_log_id" in result:
            act_result["call_log_id"] = result["call_log_id"]
    return act_result


def _act_summary(act: int, result: dict[str, Any]) -> str:
    """Generate a short human-readable summary for one act."""
    if act == Act.START:
        return result.get("started_at", "")
    if act == Act.SIGNALS:
        signals = result.get("signals", {})
        ch = len(signals.get("company_hints", []))
        ph = len(signals.get("product_hints", []))
        return f"{ch} company hints, {ph} product hints"
    if act == Act.WEB_SEARCH:
        qc = result.get("candidates_count", 0)
        qn = len(result.get("queries", [])) if qc else 0
        return f"{qc} candidates from {qn} queries"
    if act == Act.SNIPPET_FILTER:
        return f"{result.get('kept', 0)} kept, {result.get('rejected', 0)} rejected"
    if act == Act.PAGE_FETCH:
        return f"{result.get('fetched', 0)} fetched, {result.get('failed', 0)} failed"
    if act == Act.EMBEDDING:
        return f"{result.get('embedded', 0)} embedded"
    if act == Act.EVALUATION:
        return f"{result.get('evaluated', 0)} evaluated"
    if act == Act.FUSION:
        return f"{result.get('fused', 0)} fused, {result.get('rejected', 0)} rejected"
    return ""


async def _persist_result(project_id: int | None, pipeline_state: dict[str, Any]) -> None:
    """Write the full ``pipeline_state`` as a separate call-log row."""
    try:
        async with CoreDB():
            from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service

            svc = get_llm_call_log_service()
            await svc.record(
                task="endcustomer-pipeline",
                call_type="activity",
                success=True,
                project_id=project_id,
                phase="result",
                output_snapshot=json.dumps(pipeline_state),
            )
    except Exception:
        logger.exception("Failed to persist pipeline result for project_id=%d", project_id)


async def _record_act(
    project_id: int,
    act: Act,
    t0: float,
    result: dict[str, Any],
    pipeline_state: dict[str, Any],
    stop_after_act: int | None,
) -> dict[str, Any] | None:
    """Store an act's result (duration + summary) and handle stop-after-act.

    Returns an early-return payload when the workflow stops here, else ``None``.
    """
    act_result = _build_act_result(act, _ms(t0), result)
    act_result["summary"] = _act_summary(act, result)
    pipeline_state["acts"][str(int(act))] = act_result
    if stop_after_act == act:
        stopped = {**pipeline_state, "phase": "stopped", "stopped_at_act": int(act)}
        await _persist_result(project_id, stopped)
        return stopped
    return None


async def _act_start(
    ctx: WorkflowContext,
    project_id: int,
    trigger: str,
    pipeline_state: dict[str, Any],
    stop_after_act: int | None,
) -> tuple[int | None, dict[str, Any] | None]:
    """Act 1 (Start); returns ``(act1_call_log_id, early_return_payload)``."""
    t0 = time.monotonic()
    result: dict[str, Any] = {}
    act1_call_log_id: int | None = None
    async with get_act_tracker(project_id, "Act 1", trigger=trigger) as tracker:
        try:
            result = await call_activity(ctx, "EndcustomerStartActivity", {"project_id": project_id})
            tracker.result = result
            act1_call_log_id = tracker.call_log_id
            logger.info("Act 1 done for project_id=%d", project_id)
        except Exception as exc:
            logger.exception("EndCustomerResearchWorkflow: Act 1 failed for project_id=%d", project_id)
            pipeline_state["acts"]["1"] = _build_act_result(Act.START, _ms(t0), error=str(exc))
            failed = {**pipeline_state, "phase": "failed", "error": str(exc)}
            await _persist_result(project_id, failed)
            return None, failed
    return act1_call_log_id, await _record_act(project_id, Act.START, t0, result, pipeline_state, stop_after_act)


async def _act_signals(
    ctx: WorkflowContext,
    project_id: int,
    trigger: str,
    pipeline_state: dict[str, Any],
    stop_after_act: int | None,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Act 2 (Signal Extraction); returns ``(signals_result, early_return_payload)``."""
    t0 = time.monotonic()
    try:
        signals_result = await call_activity(
            ctx,
            "EndcustomerSignalExtractionActivity",
            {"project_id": project_id, "trigger": trigger},
        )
        logger.info("Act 2 done for project_id=%d", project_id)
    except Exception as exc:
        logger.exception("EndCustomerResearchWorkflow: Act 2 failed for project_id=%d", project_id)
        pipeline_state["acts"]["2"] = _build_act_result(Act.SIGNALS, _ms(t0), error=str(exc))
        return None, {**pipeline_state, "phase": "failed", "error": str(exc)}
    early = await _record_act(project_id, Act.SIGNALS, t0, signals_result, pipeline_state, stop_after_act)
    return signals_result, early


async def _act_activity(
    ctx: WorkflowContext,
    project_id: int,
    trigger: str,
    *,
    act: Act,
    activity_name: str,
    activity_arg: dict[str, Any],
    pipeline_state: dict[str, Any],
    stop_after_act: int | None,
    tracker_result: Callable[[dict[str, Any]], Any] | None = None,
) -> dict[str, Any] | None:
    """Run one tracker-wrapped activity act (3–7); returns an early-return payload or ``None``."""
    t0 = time.monotonic()
    result: dict[str, Any] = {}
    async with get_act_tracker(project_id, f"Act {int(act)}", trigger=trigger) as tracker:
        try:
            result = await call_activity(ctx, activity_name, activity_arg)
            tracker.result = tracker_result(result) if tracker_result is not None else result
            logger.info("Act %d done for project_id=%d", int(act), project_id)
        except Exception as exc:
            logger.exception("EndCustomerResearchWorkflow: Act %d failed for project_id=%d", int(act), project_id)
            pipeline_state["acts"][str(int(act))] = _build_act_result(act, _ms(t0), error=str(exc))
            return {**pipeline_state, "phase": "failed", "error": str(exc)}
    return await _record_act(project_id, act, t0, result, pipeline_state, stop_after_act)


async def _act_fusion(
    ctx: WorkflowContext,
    project_id: int,
    trigger: str,
    pipeline_state: dict[str, Any],
    act1_call_log_id: int | None,
) -> dict[str, Any]:
    """Act 8 (Fusion); persists + returns the final ``done`` payload."""
    t0 = time.monotonic()
    fusion_result: dict[str, Any] = {}
    candidates_fused: int = 0
    async with get_act_tracker(project_id, "Act 8", trigger=trigger) as tracker:
        try:
            fusion_result = await call_activity(ctx, "EndcustomerFusionActivity", {"project_id": project_id})
            candidates_fused = fusion_result.get("fused", 0)
            tracker.result = {"fused": candidates_fused, "rejected": fusion_result.get("rejected", 0)}
            logger.info("Act 8 done for project_id=%d — fused=%d", project_id, candidates_fused)
        except Exception as exc:
            logger.exception("EndCustomerResearchWorkflow: Act 8 failed for project_id=%d", project_id)
            pipeline_state["acts"]["8"] = _build_act_result(Act.FUSION, _ms(t0), error=str(exc))
            return {**pipeline_state, "phase": "failed", "error": str(exc)}
    await _record_act(project_id, Act.FUSION, t0, fusion_result, pipeline_state, None)
    done = {**pipeline_state, "phase": "done", "candidates_fused": candidates_fused}
    await _persist_result(act1_call_log_id, done)
    return done


@endcustomer_research_workflow.handler()
async def run(ctx: WorkflowContext, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute the endcustomer research pipeline for a project.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int), ``trigger`` (str), and
            optional ``stop_after_act`` (int, 1-8).

    Returns:
        Dict with ``project_id``, ``phase`` (``"done"``, ``"stopped"``,
        or ``"failed"``), ``stopped_at_act`` (if stopped), ``acts``
        (per-act results), and ``candidates_fused`` (if done).
    """
    project_id: int = arg["project_id"]
    trigger: str = arg.get("trigger", "pipeline")
    stop_after_act: int | None = arg.get("stop_after_act")

    if stop_after_act is not None and (stop_after_act < Act.START or stop_after_act > Act.FUSION):
        raise ValueError(f"stop_after_act must be 1-8, got {stop_after_act}")

    logger.info(
        "V2 EndCustomerResearchWorkflow: project_id=%d trigger=%s stop_after_act=%s",
        project_id,
        trigger,
        stop_after_act,
    )

    pipeline_state: dict[str, Any] = {"project_id": project_id, "acts": {}}

    # ── Act 1: Start ─────────────────────────────────────────────────────────
    act1_call_log_id, early = await _act_start(ctx, project_id, trigger, pipeline_state, stop_after_act)
    if early is not None:
        return early

    # ── Act 2: Signal Extraction ─────────────────────────────────────────────
    # No ActTracker here – the LLM call (endcustomer-extraction) already
    # creates a full call-log row with phase="Act 2", making a separate
    # activity tracker row redundant.
    signals_result, early = await _act_signals(ctx, project_id, trigger, pipeline_state, stop_after_act)
    if early is not None:
        return early
    assert signals_result is not None  # _act_signals pairs a missing result with a non-None early payload

    # ── Acts 3–7: activity-backed pipeline steps ─────────────────────────────
    middle_acts = [
        (
            Act.WEB_SEARCH,
            "EndcustomerWebSearchQueryActivity",
            {"project_id": project_id, "signals": signals_result["signals"], "trigger": trigger},
            lambda r: {"candidates": r.get("candidates_count", 0)},
        ),
        (Act.SNIPPET_FILTER, "EndcustomerSnippetFilterActivity", {"project_id": project_id}, None),
        (Act.PAGE_FETCH, "EndcustomerPageFetchActivity", {"project_id": project_id}, None),
        (Act.EMBEDDING, "EndcustomerEmbeddingActivity", {"project_id": project_id}, None),
        (
            Act.EVALUATION,
            "EndcustomerEvaluationActivity",
            {"project_id": project_id, "signals": signals_result["signals"]},
            None,
        ),
    ]
    for act, activity_name, activity_arg, tracker_transform in middle_acts:
        early = await _act_activity(
            ctx,
            project_id,
            trigger,
            act=act,
            activity_name=activity_name,
            activity_arg=activity_arg,
            pipeline_state=pipeline_state,
            stop_after_act=stop_after_act,
            tracker_result=tracker_transform,
        )
        if early is not None:
            return early

    # ── Act 8: Fusion ────────────────────────────────────────────────────────
    return await _act_fusion(ctx, project_id, trigger, pipeline_state, act1_call_log_id)


def _ms(start: float) -> int:
    """Convert a ``time.monotonic()`` start timestamp to elapsed ms."""
    return int((time.monotonic() - start) * 1000)

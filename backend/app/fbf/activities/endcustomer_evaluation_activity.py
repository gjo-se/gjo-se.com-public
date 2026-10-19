"""Restate activity – Act 7: LLM Evaluation.

Bewertet jeden Candidate via LLM-Task ``endcustomer-evaluation``:
Page-Text + Vector-Similarity gegen ``EndcustomerSignalsOut`` →
Confidence + Reasoning. Persistiert beide Felder.

Three-phase approach (MergeActivity-Pattern):
1. Fetch – GjoDB: Lade Candidates + Projekt-Signale.
2. LLM – CoreDB: ``execute_task("endcustomer-evaluation", ...)``.
3. Persist – GjoDB: Schreibe ``confidence`` + ``reasoning``.
"""

from __future__ import annotations

import json
from typing import Any, NamedTuple

import structlog
from restate import Context, Service

from app.fbf.repositories import project_endcustomer_candidate_read_repository as candidate_read_repo
from app.fbf.repositories import project_endcustomer_candidate_repository as repo
from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.db_access.session import AsyncSessionLocal as GjoDB
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service

logger = structlog.get_logger(__name__)

endcustomer_evaluation_activity_service = Service("EndcustomerEvaluationActivity")


class _Evaluation(NamedTuple):
    """LLM evaluation outcome for one candidate (confidence + reasoning)."""

    confidence: float
    reasoning: str


def _normalise_signals(signals_raw: object) -> str:
    """Normalise the signals payload (dict / JSON string / other) to a JSON string."""
    if isinstance(signals_raw, dict):
        return json.dumps(signals_raw)
    if isinstance(signals_raw, str):
        return signals_raw
    return json.dumps(signals_raw)


def _pending_candidates(rows: list[Any]) -> list[Any]:
    """Keep pending candidates that carry a career-page description and a similarity."""
    return [
        row.candidate
        for row in rows
        if row.status == "pending"
        and row.candidate.career_page_description
        and row.candidate.similarity_to_project is not None
    ]


async def _evaluate_candidate(
    candidate: Any,
    *,
    signals_json: str,
    project_id: int,
    trigger: str,
) -> _Evaluation | None:
    """Run the LLM evaluation for one candidate.

    Returns:
        The parsed :class:`_Evaluation`, or ``None`` when the LLM call fails, the
        task reports no success, or the result carries no confidence – the caller
        then skips persistence for this candidate.
    """
    try:
        async with CoreDB() as core_db:
            result = await get_task_executor_service().execute_task(
                db=core_db,
                task_key="endcustomer-evaluation",
                variables={
                    "page_text": candidate.career_page_description or "",
                    "similarity": str(candidate.similarity_to_project),
                    "signals": signals_json,
                },
                project_id=project_id,
                trigger=trigger,
            )
    except Exception:
        logger.exception("Act 7: LLM call failed for candidate %d", candidate.id)
        return None

    if not result.get("success"):
        logger.warning(
            "Act 7: evaluation failed for candidate %d: %s",
            candidate.id,
            result.get("error_type", "unknown"),
        )
        return None

    # result["result"] is an EndcustomerEvaluationOut Pydantic model instance
    eval_result: object = result.get("result")
    if eval_result is None:
        return None

    confidence: float | None = getattr(eval_result, "confidence", None)
    if confidence is None:
        return None

    reasoning: str | None = getattr(eval_result, "reasoning", None)
    return _Evaluation(confidence=confidence, reasoning=reasoning or "")


@endcustomer_evaluation_activity_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Evaluate candidates via LLM and persist confidence + reasoning.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int), ``trigger`` (str),
            and ``signals`` (dict or JSON string of EndcustomerSignalsOut).

    Returns:
        Dict with ``project_id`` and ``evaluated`` (int).
    """
    project_id: int = arg["project_id"]
    trigger: str = arg.get("trigger", "pipeline")
    signals_json = _normalise_signals(arg.get("signals", {}))

    # ── Phase 1: Fetch candidates (short-lived GjoDB session) ─────────────
    async with GjoDB() as gjo_db:
        rows = await candidate_read_repo.get_by_project_rows(gjo_db, project_id)

    to_evaluate = _pending_candidates(rows)
    if not to_evaluate:
        logger.info("Act 7: no pending candidates with description+similarity for project %d", project_id)
        return {"project_id": project_id, "evaluated": 0}

    # ── Phase 2+3: LLM evaluation + persist (one session per candidate) ───
    evaluated: int = 0
    for candidate in to_evaluate:
        evaluation = await _evaluate_candidate(
            candidate,
            signals_json=signals_json,
            project_id=project_id,
            trigger=trigger,
        )
        if evaluation is None:
            continue

        async with GjoDB() as gjo_db:
            await repo.update_fields(
                gjo_db,
                candidate.id,
                confidence=evaluation.confidence,
                reasoning=evaluation.reasoning,
            )
        evaluated += 1

    logger.info("Act 7: project_id=%d evaluated=%d", project_id, evaluated)
    return {"project_id": project_id, "evaluated": evaluated}

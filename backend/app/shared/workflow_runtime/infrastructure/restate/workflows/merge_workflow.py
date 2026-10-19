"""MergeWorkflow — sequentielle Merge → Extract Pipeline.

Führt Description Merge und Skill Extraction für ein Projekt aus.
Activities laufen als Restate Service-Invocationen via ``ctx.generic_call``
— jede mit eigener DB-Session und ohne Event-Loop-Konflikte.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Workflow, WorkflowContext

from app.shared.workflow_runtime.infrastructure.restate.activity_call import call_activity

logger = structlog.get_logger(__name__)

merge_workflow = Workflow("MergeWorkflow")


@merge_workflow.handler()
async def run(ctx: WorkflowContext, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute merge → extract for a single project.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and ``trigger`` (str) keys.

    Returns:
        Dict with ``project_id``, ``phase`` (``"done"`` or ``"failed"``),
        and ``merged_text`` (if successful).
    """
    project_id: int = arg["project_id"]
    trigger: str = arg.get("trigger", "pipeline")

    from app.shared.db_access.trace import trace

    trace("06_workflow_start", project_id=project_id, trigger=trigger)
    logger.info("MergeWorkflow: project_id=%d trigger=%s", project_id, trigger)

    # ── Phase 1: Description Merge ──────────────────────────────────────────
    try:
        merge_result = await call_activity(
            ctx,
            "MergeActivity",
            {"project_id": project_id, "trigger": trigger},
        )
    except Exception as exc:
        logger.exception("MergeWorkflow: merge failed for project_id=%d", project_id)
        return {"project_id": project_id, "phase": "failed", "error": str(exc)}

    if not merge_result.get("ok"):
        error = merge_result.get("error", "unknown")
        logger.error("MergeWorkflow: merge returned failure for project_id=%d: %s", project_id, error)
        return {"project_id": project_id, "phase": "failed", "error": error}

    merged_text: str = merge_result.get("merged_text", "")
    logger.info(
        "MergeWorkflow: merge done for project_id=%d (%d chars)",
        project_id,
        len(merged_text),
    )

    # ── Phase 2: Skill Extraction ───────────────────────────────────────────
    try:
        extract_result = await call_activity(
            ctx,
            "ExtractActivity",
            {"project_id": project_id, "trigger": trigger},
        )
    except Exception as exc:
        logger.exception("MergeWorkflow: extract failed for project_id=%d", project_id)
        return {
            "project_id": project_id,
            "phase": "failed",
            "merged_text": merged_text,
            "error": str(exc),
        }

    if not extract_result.get("ok"):
        error = extract_result.get("error", "unknown")
        logger.error(
            "MergeWorkflow: extract returned failure for project_id=%d: %s",
            project_id,
            error,
        )
        return {
            "project_id": project_id,
            "phase": "failed",
            "merged_text": merged_text,
            "error": error,
        }

    skills_count: int = extract_result.get("skills_count", 0)
    logger.info(
        "MergeWorkflow: extract done for project_id=%d (%d skills)",
        project_id,
        skills_count,
    )

    return {
        "project_id": project_id,
        "phase": "done",
        "merged_text": merged_text,
        "skills_count": skills_count,
    }

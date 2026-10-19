"""RetryBatchWorkflow — sequentieller Retry-Loop über Call-Log-IDs.

Iteriert über eine Liste von Call-Log-IDs, retried jeden Eintrag
einzeln via ``RetryCallLogActivity`` und trackt Fortschritt via
Restate Durable State.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Workflow, WorkflowContext

from app.shared.workflow_runtime.infrastructure.restate.activity_call import call_activity

logger = structlog.get_logger(__name__)

retry_batch_workflow = Workflow("RetryBatchWorkflow")

_STATE_KEY_PROGRESS = "progress"


@retry_batch_workflow.handler()
async def run(ctx: WorkflowContext, arg: dict[str, Any]) -> dict[str, Any]:
    """Retry a batch of call-log entries sequentially.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``call_log_ids`` (list[int]) key.

    Returns:
        Dict with ``done``, ``total``, ``failed``, ``status`` keys.
    """
    call_log_ids: list[int] = arg["call_log_ids"]
    total = len(call_log_ids)
    done = 0
    failed = 0
    skipped = 0

    _update_progress(ctx, done, total, failed, "running")

    for call_log_id in call_log_ids:
        try:
            result = await call_activity(
                ctx,
                "RetryCallLogActivity",
                {"call_log_id": call_log_id},
                key=call_log_id,
            )
            if result.get("skipped"):
                skipped += 1
                logger.debug("RetryBatchWorkflow: skipped call_log=%d (dead)", call_log_id)
            elif result.get("success"):
                done += 1
            else:
                failed += 1
                logger.warning("RetryBatchWorkflow: call_log=%d retry failed", call_log_id)
        except Exception:
            failed += 1
            logger.exception("RetryBatchWorkflow: call_log=%d crashed", call_log_id)

        _update_progress(ctx, done, total, failed, "running")

    final_status = "completed" if failed == 0 else "completed_with_errors"
    _update_progress(ctx, done, total, failed, final_status)

    logger.info(
        "RetryBatchWorkflow: done=%d failed=%d skipped=%d total=%d",
        done,
        failed,
        skipped,
        total,
    )
    return {"done": done, "total": total, "failed": failed, "status": final_status}


def _update_progress(
    ctx: WorkflowContext,
    done: int,
    total: int,
    failed: int,
    status: str,
) -> None:
    """Persist progress counters to Restate durable state."""
    ctx.set(
        _STATE_KEY_PROGRESS,
        {"done": done, "total": total, "failed": failed, "status": status},
    )

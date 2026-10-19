"""GenericTaskWorkflow — LLM task executor with deferred execution support.

Wraps :func:`task_executor_service.execute_task` in a Restate workflow.
Supports deferred (delayed) execution via ``ctx.sleep()``, replacing
arq ``_defer_by`` semantics.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import structlog
from restate import Workflow, WorkflowContext

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service

logger = structlog.get_logger(__name__)

generic_task_workflow = Workflow("GenericTaskWorkflow")


@generic_task_workflow.handler()
async def run(
    ctx: WorkflowContext,
    arg: dict[str, Any],
) -> dict[str, Any]:
    """Execute a generic LLM task with optional deferred start.

    Args:
        ctx: Restate workflow context (durable sleep).
        arg: Dict with ``task_key``, ``variables``, ``project_id``,
            ``trigger``, ``auto_retry_attempt``, ``defer_seconds`` keys.

    Returns:
        Dict with ``success``, ``result``, ``call_log_id``, ``error_type``
        (same structure as ``task_executor_service.execute_task``).
    """
    from app.shared.db_access.consumer_label import set_consumer_label

    set_consumer_label("restate:workflow")
    task_key: str = arg["task_key"]
    variables: dict[str, str] = arg.get("variables", {})
    project_id: int = arg["project_id"]
    trigger: str = arg["trigger"]
    auto_retry_attempt: int = arg.get("auto_retry_attempt", 0)
    defer_seconds: int | None = arg.get("defer_seconds")

    # ── Deferred execution ──────────────────────────────────────────────────
    if defer_seconds and defer_seconds > 0:
        logger.info(
            "GenericTaskWorkflow: deferring %ds for task=%s project_id=%d",
            defer_seconds,
            task_key,
            project_id,
        )
        await ctx.sleep(timedelta(seconds=defer_seconds))

    # ── Execute task (direct DB — handler runs in main event loop) ──────────
    async with AsyncSessionLocal() as db:
        result = await get_task_executor_service().execute_task(
            db=db,
            task_key=task_key,
            variables=variables,
            project_id=project_id,
            trigger=trigger,
            auto_retry_attempt=auto_retry_attempt,
        )

    logger.info(
        "GenericTaskWorkflow: task=%s project_id=%d → success=%s",
        task_key,
        project_id,
        result.get("success"),
    )
    return result

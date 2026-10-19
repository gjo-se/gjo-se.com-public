"""Restate activity for Description Merge.

Wraps the existing ``task_executor_service.execute_task`` call for
``"description-merge"`` and persists the result on the master project.

IMPORTANT: DB sessions are NOT held across the LLM call.  Each phase
opens and closes its own session so that 50 concurrent MergeActivity
invocations never exhaust the connection pool.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from restate import Context, Service

from app.fbf.repositories import project_repository
from app.fbf.services.description_merge_service import (
    _build_variables,
)
from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.db_access.session import AsyncSessionLocal as GjoDB
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service

logger = structlog.get_logger(__name__)

merge_activity_service = Service("MergeActivity")


@merge_activity_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute the description-merge step for a project.

    Three-phase approach to avoid holding DB connections during the LLM
    call (which may block on the ``LLM_MAX_CONCURRENT`` semaphore):

    1. **Fetch** — open gjo+core sessions, load project data, close.
    2. **LLM**  — open a fresh core session for the executor
       (resolve mapping, call LLM, write call-log), close.
    3. **Persist** — open a gjo session, write result, close.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and ``trigger`` (str) keys.

    Returns:
        Dict with ``ok`` (bool), ``merged_text`` (the LLM output, on
        success) and ``project_id``.  On business failure ``ok`` is
        ``False`` and ``error`` carries the reason – failures are never
        raised so Restate does not retry the invocation forever.
    """
    from app.shared.db_access.consumer_label import set_consumer_label
    from app.shared.db_access.trace import trace

    set_consumer_label("restate:merge")
    project_id: int = arg["project_id"]
    trigger: str = arg["trigger"]
    trace("08_merge_activity_start", project_id=project_id, trigger=trigger)

    # Business errors (LLM failures, missing project) MUST NOT propagate as
    # exceptions: Restate would retry the invocation forever, re-running the
    # LLM call on every attempt.  Instead the failure is returned as a plain
    # result dict and the workflow maps it to ``phase="failed"``.
    try:
        # ── Phase 1: Fetch project data (short-lived sessions) ─────────
        async with GjoDB() as gjo_db:
            master = await project_repository.get_out_by_id(gjo_db, project_id)
            if master is None:
                return {
                    "ok": False,
                    "error": f"Project {project_id} not found",
                    "project_id": project_id,
                }

            slaves = await project_repository.get_slaves_out(gjo_db, project_id)
            variables = _build_variables(master, slaves)

        # gjo_db is now closed — connection returned to pool

        # ── Phase 2: LLM call (fresh core session for the executor) ────
        # The executor needs core_db for task-mapping resolution and
        # call-log writes.  A fresh session is opened here so the gjo
        # connection from Phase 1 is not held during the (potentially
        # long) semaphore wait.
        async with CoreDB() as core_db:
            result = await get_task_executor_service().execute_task(
                db=core_db,
                task_key="description-merge",
                variables=variables,
                project_id=project_id,
                trigger=trigger,
            )

        # core_db is now closed — connection returned to pool

        if not result.get("success"):
            return {
                "ok": False,
                "error": (f"Description merge failed: {result.get('error_type', 'unknown')}"),
                "project_id": project_id,
            }

        merged_text: str = result["result"]

        # ── Phase 3: Persist result (short-lived gjo session) ──────────
        async with GjoDB() as gjo_db:
            await project_repository.set_merged_fields(
                gjo_db,
                project_id,
                merged_description_de=merged_text,
                merged_at=datetime.now(UTC),
            )
            await gjo_db.commit()
    except Exception as exc:
        logger.exception(
            "MergeActivity: failed for project_id=%d – returning failure result",
            project_id,
        )
        return {"ok": False, "error": str(exc), "project_id": project_id}

    logger.info(
        "MergeActivity: project_id=%d trigger=%s → %d chars merged",
        project_id,
        trigger,
        len(merged_text),
    )
    return {"ok": True, "merged_text": merged_text, "project_id": project_id}

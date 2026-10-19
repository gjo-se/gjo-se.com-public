"""FastAPI router for task queue status/query operations.

Endpoints:
    GET  /tasks/{task_id}                – poll a single task's status
    GET  /tasks/{task_id}/pipeline-result – parsed pipeline result
    POST /tasks/bulk-status              – poll several tasks at once
    GET  /tasks/{task_id}/progress       – poll a batch task's progress

The enqueue endpoints (bulk-merge, research-endcustomer) live in
:mod:`workflow_dispatch_router`.
"""

from __future__ import annotations

import json

import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.shared.config.config import settings
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.workflow_runtime.infrastructure.restate.query import (
    UnsafeSqlValueError,
    get_batch_progress,
    require_safe_sql_value,
)

logger = structlog.get_logger(__name__)

# Mindestanzahl der ``/``-Segmente eines Restate-Targets („Workflow/{key}/run").
_TARGET_MIN_PARTS = 2

task_router = APIRouter(prefix="/tasks")


# ── Schemas ──────────────────────────────────────────────────────────────────


class TaskStatusResponse(BaseModel):
    """Progress snapshot of a single asynchronous task.

    All optional fields stay ``None`` until the workflow reaches the phase
    that produces them (progress counting, totals, error, or phase label).
    """

    status: str
    progress: int | None = None
    total: int | None = None
    error: str | None = None
    project_id: int | None = None
    phase: str | None = None


class BulkStatusRequest(BaseModel):
    """Request body for polling the status of several tasks at once."""

    task_ids: list[str] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of task IDs to check.",
    )


class BulkStatusResponse(BaseModel):
    """Response mapping each requested task ID to its status snapshot."""

    statuses: dict[str, TaskStatusResponse]


# ── Routes ───────────────────────────────────────────────────────────────────


@task_router.get(
    "/{task_id}",
    response_model=TaskStatusResponse,
    summary="Poll a task's current status",
)
async def get_task(
    task_id: str,
    _admin: AdminUser,
) -> TaskStatusResponse:
    """Return the current state of a single task by its ID.

    Returns 404 when the task ID is unknown (never existed or TTL expired).
    """
    return await _get_restate_task_status(task_id)


@task_router.get(
    "/{task_id}/pipeline-result",
    response_model=dict,
    summary="Return the parsed pipeline result for a completed workflow",
)
async def get_pipeline_result(
    task_id: str,
    _admin: AdminUser,
) -> dict[str, object]:
    """Return the pipeline result from the ``llm_call_log`` table.

    The workflow writes its final ``pipeline_state`` via ``_persist_result``
    with ``phase="result"``.  We extract the ``project_id`` from the Restate
    task record for filtered lookup.
    """
    from app.shared.db_access.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select

            from app.shared.llm_gateway.models.call_log import CallLog

            # Resolve project_id from the Restate task record so we can
            # filter by project (multiple pipelines may run concurrently).
            task_status = await _get_restate_task_status(task_id)
            project_id = task_status.project_id if task_status else None

            stmt = (
                select(CallLog)
                .where(
                    CallLog.task == "endcustomer-pipeline",
                    CallLog.phase == "result",
                    CallLog.output_snapshot.isnot(None),
                )
                .order_by(CallLog.id.desc())
                .limit(1)
            )
            if project_id is not None:
                stmt = stmt.where(CallLog.project_id == project_id)
            result = await db.execute(stmt)
            row = result.scalar_one_or_none()
            if row is None or not row.output_snapshot:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pipeline result not yet available",
                )
            return json.loads(row.output_snapshot)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("pipeline-result lookup failed")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pipeline result lookup failed: {exc}",
        ) from exc


@task_router.post(
    "/bulk-status",
    response_model=BulkStatusResponse,
    summary="Poll multiple task statuses in one request",
)
async def bulk_status(
    body: BulkStatusRequest,
    _admin: AdminUser,
) -> BulkStatusResponse:
    """Return statuses for multiple task IDs in a single request.

    Uses ONE SQL query with OR conditions instead of N individual queries.
    """
    import httpx

    statuses: dict[str, TaskStatusResponse] = {}
    task_ids = body.task_ids

    # Restate's /query kennt kein Parameter-Binding: Werte werden deshalb strikt
    # validiert, bevor sie in die SQL-Zeichenkette interpoliert werden (CWE-89).
    try:
        safe_ids = [require_safe_sql_value(tid, field="task_ids") for tid in task_ids]
    except UnsafeSqlValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültige task_id: {exc}",
        ) from exc

    # Build OR conditions for all task IDs
    or_clauses = " OR ".join(f"target LIKE '%{tid}%'" for tid in safe_ids)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.RESTATE_URL}/query",
                json={
                    "query": (f"SELECT target, status, completion_result FROM sys_invocation WHERE {or_clauses}"),
                },
                headers={"Accept": "application/json"},
            )
            if resp.is_success:
                # Build lookup: key → (status, completion_result)
                lookup: dict[str, tuple[str, str | None]] = {}
                for row in resp.json().get("rows", []):
                    target: str = row.get("target", "")
                    # target format: "MergeWorkflow/{key}/run"
                    parts = target.split("/")
                    if len(parts) >= _TARGET_MIN_PARTS:
                        key = parts[1]
                        lookup[key] = (
                            row.get("status", "unknown"),
                            row.get("completion_result"),
                        )

                for tid in task_ids:
                    if tid in lookup:
                        restate_status, completion_result = lookup[tid]
                        statuses[tid] = _map_status(restate_status, completion_result)
                    else:
                        statuses[tid] = TaskStatusResponse(status="failed", error="Task nicht gefunden")
            else:
                # SQL query failed — mark all as failed
                logger.warning(
                    "Restate query returned %d for %d task IDs – marking all as failed.",
                    resp.status_code,
                    len(task_ids),
                )
                for tid in task_ids:
                    statuses[tid] = TaskStatusResponse(status="failed", error="Poll fehlgeschlagen")
    except Exception:
        logger.exception("Restate poll failed for %d task IDs.", len(task_ids))
        for tid in task_ids:
            statuses[tid] = TaskStatusResponse(status="failed", error="Poll fehlgeschlagen")

    return BulkStatusResponse(statuses=statuses)


def _map_status(restate_status: str, completion_result: str | None) -> TaskStatusResponse:
    """Map Restate invocation status to frontend TaskStatusResponse."""
    if restate_status == "completed":
        if completion_result == "success":
            return TaskStatusResponse(status="done")
        return TaskStatusResponse(status="failed", error="Workflow failed")
    if restate_status in ("queued", "scheduled", "inboxed"):
        return TaskStatusResponse(status="running")
    if restate_status == "running":
        return TaskStatusResponse(status="running")
    if restate_status == "suspended":
        return TaskStatusResponse(status="running")
    if restate_status == "backing-off":
        return TaskStatusResponse(status="failed", error="Workflow fehlgeschlagen")
    return TaskStatusResponse(status="running")


@task_router.get(
    "/{task_id}/progress",
    response_model=TaskStatusResponse,
    summary="Poll a batch task's progress",
)
async def get_task_progress(
    task_id: str,
    _admin: AdminUser,
) -> TaskStatusResponse:
    """Return the current progress of a batch task via Restate state.

    Returns 404 when not found.
    """
    data = await get_batch_progress(task_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found",
        )
    return TaskStatusResponse(
        status=data.get("status", "unknown"),
        progress=data.get("done"),
        total=data.get("total"),
        error=None,
    )


async def _get_restate_task_status(task_id: str) -> TaskStatusResponse:
    """Query Restate invocation status for a task.

    Uses the SQL introspection API to find the invocation by its workflow
    key (embedded in the ``target`` column as ``WorkflowName/{key}/run``).
    """
    import httpx

    # Restate's /query kennt kein Parameter-Binding: strikte Validierung vor der
    # Interpolation schützt vor SQL-Injection (CWE-89).
    try:
        safe_task_id = require_safe_sql_value(task_id, field="task_id")
    except UnsafeSqlValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültige task_id: {exc}",
        ) from exc

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.RESTATE_URL}/query",
                json={
                    "query": (
                        "SELECT status, completion_result "
                        "FROM sys_invocation "
                        f"WHERE target LIKE '%{safe_task_id}%' "
                        "ORDER BY created_at DESC LIMIT 1"
                    ),
                },
                headers={"Accept": "application/json"},
            )
            if not resp.is_success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task {task_id} not found",
                )

            rows = resp.json().get("rows", [])
            if not rows:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task {task_id} not found",
                )

            row = rows[0]
            return _map_status(row.get("status", "unknown"), row.get("completion_result"))
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found",
        ) from err

"""FastAPI router for task enqueue endpoints.

Endpoints:
    POST /tasks/bulk-merge           – enqueue N merge jobs, return task references
    POST /tasks/research-endcustomer – enqueue an endcustomer research run

The status/query endpoints live in :mod:`workflow_router`.
"""

from __future__ import annotations

import asyncio

import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.workflow_runtime.infrastructure.restate.dispatch import (
    enqueue_endcustomer_research,
    enqueue_merge,
)

logger = structlog.get_logger(__name__)

task_dispatch_router = APIRouter(prefix="/tasks")


# ── Schemas ──────────────────────────────────────────────────────────────────


class BulkMergeRequest(BaseModel):
    """Request body for enqueuing a bulk merge of master projects."""

    project_ids: list[int] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of master project IDs to merge.",
    )


class TaskRef(BaseModel):
    """Reference to a just-enqueued merge task and its project."""

    task_id: str
    project_id: int


class BulkMergeResponse(BaseModel):
    """Response listing the task references created by a bulk merge."""

    tasks: list[TaskRef]


class ResearchEndcustomerRequest(BaseModel):
    """Request body for kicking off the endcustomer research pipeline."""

    project_id: int = Field(
        ...,
        description="Project ID to research endcustomers for.",
    )
    stop_after_act: int | None = Field(
        default=None,
        ge=1,
        le=8,
        description="Stop the pipeline after this act (1-8). None = full pipeline.",
    )


# ── Routes ───────────────────────────────────────────────────────────────────


@task_dispatch_router.post(
    "/bulk-merge",
    response_model=BulkMergeResponse,
    summary="Enqueue description-merge jobs for multiple projects",
)
async def bulk_merge(
    body: BulkMergeRequest,
    _admin: AdminUser,
) -> BulkMergeResponse:
    """Enqueue a MergeWorkflow for each given project ID via Restate.

    Concurrency is governed by the global LLMClient semaphore
    (LLM_MAX_CONCURRENT) and the DB connection pool.
    """
    try:
        from app.shared.db_access.trace import trace

        trace("02_bulk_enqueue_start", count=len(body.project_ids))
        refs = await asyncio.gather(
            *[enqueue_merge(pid, trigger="bulk") for pid in body.project_ids],
        )
        trace("04_bulk_enqueue_done", count=len(refs))
    except RuntimeError as exc:
        logger.error("Bulk merge aborted – Restate error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    tasks = [
        TaskRef(task_id=task_id, project_id=project_id)
        for project_id, task_id in zip(body.project_ids, refs, strict=True)
    ]
    return BulkMergeResponse(tasks=tasks)


@task_dispatch_router.post(
    "/research-endcustomer",
    response_model=TaskRef,
    summary="Enqueue endcustomer research for a project",
)
async def research_endcustomer(
    body: ResearchEndcustomerRequest,
    _admin: AdminUser,
) -> TaskRef:
    """Trigger an EndCustomerResearchWorkflow for the given project.

    Runs Acts 1-8 sequentially (or stops early if ``stop_after_act`` is set):
    Start→Extraction→Search→Filter→Fetch→Embed→Evaluate→Fuse.
    Results are persisted in ``project_endcustomer_candidate``.
    """
    try:
        trigger = "act-test" if body.stop_after_act is not None else "button"
        task_id = await enqueue_endcustomer_research(
            body.project_id,
            trigger=trigger,
            stop_after_act=body.stop_after_act,
        )
    except RuntimeError as exc:
        logger.error("Endcustomer research failed – Restate error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return TaskRef(task_id=task_id, project_id=body.project_id)

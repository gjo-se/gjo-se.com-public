"""Trigger-observer routes for LLM tasks (admin-only)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.schemas.task_schemas import (
    TaskExamplesResponse,
    TriggerStatsResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/tasks/{task}/triggers",
    response_model=TriggerStatsResponse,
    summary="[Admin] Live trigger statistics for a task",
)
async def get_task_triggers(
    task: str,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> TriggerStatsResponse:
    """Return allowed, observed, and unused triggers for *task*.

    ``observed`` triggers are aggregated from ``llm_call_log`` and sorted by
    count descending.  ``unused`` triggers are those defined in the registry
    that have never been recorded.

    Args:
        task: Task key from the registry.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        TriggerStatsResponse with allowed, observed, and unused lists.

    Raises:
        HTTPException 404: Unknown task.
    """
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_trigger_observer_service

    if task not in TASK_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown task: '{task}'",
        )

    return await get_trigger_observer_service().get_trigger_stats(db, task)


@router.get(
    "/tasks/{task}/examples",
    response_model=TaskExamplesResponse,
    summary="[Admin] Input/output examples from the most recent call logs",
)
async def get_task_examples(
    task: str,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> TaskExamplesResponse:
    """Return input/output examples for *task* from ``llm_call_log``.

    ``input_example`` is the ``input_snapshot`` of the most recent call.
    ``output_schema`` is a JSON Schema dict for structured-output tasks
    (``None`` for text-mode tasks).
    ``output_example`` is the ``input_snapshot`` (which holds the serialised
    result) of the most recent successful call.

    Args:
        task: Task key from the registry.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        TaskExamplesResponse with input/output examples.

    Raises:
        HTTPException 404: Unknown task.
    """
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_trigger_observer_service

    if task not in TASK_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown task: '{task}'",
        )

    return await get_trigger_observer_service().get_latest_examples(db, task)


@router.get(
    "/tasks/{task}/avg-duration",
    summary="[Admin] Average call duration for a task (in ms)",
)
async def get_task_avg_duration(
    task: str,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Return the average ``duration_ms`` for successful calls of *task*.

    Used by the FE to estimate progress bar fill time during bulk merges.
    Returns ``{"avg_duration_ms": null}`` if no successful calls exist.
    """
    from sqlalchemy import func

    from app.shared.llm_gateway.models.call_log import CallLog

    if task not in TASK_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown task: '{task}'",
        )

    result = await db.scalar(
        select(func.avg(CallLog.duration_ms)).where(
            CallLog.task == task,
            CallLog.success.is_(True),
            CallLog.duration_ms.is_not(None),
        )
    )
    return {"avg_duration_ms": int(result) if result is not None else None}

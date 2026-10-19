"""Evaluation-trigger routes for LLM tasks (admin-only)."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.schemas.task_schemas import (
    EvalRunResponse,
    EvalTriggerRequest,
    EvalTriggerResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/tasks/{task}/eval",
    response_model=EvalTriggerResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="[Admin] Trigger evaluation run for a task",
)
async def trigger_task_eval(
    task: str,
    _admin: AdminUser,
    data: EvalTriggerRequest = EvalTriggerRequest(),
    db: AsyncSession = Depends(get_db),
):
    """Enqueue an evaluation run for *task* via arq.

    Returns immediately – the actual gate suite runs asynchronously.
    """
    if task not in TASK_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown task: '{task}'",
        )

    # Clean up stale running evals (e.g. from crashed Restate invocations).
    from app.shared.llm_gateway.models.eval_run import EvalRun

    stale = await db.scalars(select(EvalRun).where(EvalRun.task == task, EvalRun.overall_status == "running"))
    for ev in stale:
        ev.overall_status = "failed"
        gate_results = ev.gate_results or []
        gate_results.append(
            {
                "gate": "system",
                "status": "blocked",
                "score": 0.0,
                "details": {"reason": "stale run cleaned up before new eval"},
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )
        ev.gate_results = gate_results
    if stale:
        await db.commit()

    from app.shared.workflow_runtime.infrastructure.restate.dispatch import enqueue_eval_task

    await enqueue_eval_task(task, data.trigger)

    return EvalTriggerResponse(
        message="Eval run enqueued",
        task=task,
        trigger=data.trigger,
    )


@router.get(
    "/tasks/{task}/eval/latest",
    response_model=EvalRunResponse,
    summary="[Admin] Get latest evaluation run for a task",
)
async def get_latest_eval_run(
    task: str,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> EvalRunResponse:
    """Return the most recent evaluation run for *task*."""
    from app.shared.llm_gateway.models.eval_run import EvalRun

    run = await db.scalar(select(EvalRun).where(EvalRun.task == task).order_by(EvalRun.created_at.desc()).limit(1))
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No eval run found for task '{task}'",
        )
    return EvalRunResponse.model_validate(run)


@router.get(
    "/tasks/{task}/eval/latest-batch",
    response_model=list[EvalRunResponse],
    summary="[Admin] Get latest evaluation batch (all candidates from the same trigger)",
)
async def get_latest_eval_batch(
    task: str,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> list[EvalRunResponse]:
    """Return ALL eval runs from the same batch as the latest run.

    Uses the ``batch_id`` column: every ``run_gates()`` invocation
    generates a shared UUID, so all candidates evaluated together
    share the same ``batch_id``.
    """
    from app.shared.llm_gateway.models.eval_run import EvalRun

    latest = await db.scalar(select(EvalRun).where(EvalRun.task == task).order_by(EvalRun.created_at.desc()).limit(1))
    if latest is None or latest.batch_id is None:
        return []

    batch = await db.scalars(
        select(EvalRun)
        .where(
            EvalRun.task == task,
            EvalRun.batch_id == latest.batch_id,
        )
        .order_by(EvalRun.created_at.asc())
    )
    return [EvalRunResponse.model_validate(r) for r in batch.all()]

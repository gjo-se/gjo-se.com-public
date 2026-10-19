"""Call-log ↔ LangFuse dataset promote/un-promote/list routes (admin-only)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.schemas.task_schemas import (
    PromoteToDatasetRequest,
    PromoteToDatasetResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/call-logs/{call_log_id}/promote-to-dataset",
    response_model=PromoteToDatasetResponse,
    summary="[Admin] Promote a call log to a LangFuse dataset (golden/failure)",
)
async def promote_call_log_to_dataset(
    call_log_id: int,
    _admin: AdminUser,
    data: PromoteToDatasetRequest,
    db: AsyncSession = Depends(get_db),
) -> PromoteToDatasetResponse:
    """Promote a call log entry to a LangFuse golden or failure dataset.

    Auto-validates the label against the call log's error state,
    detects near-duplicates via embedding similarity, and writes
    the item to the corresponding LangFuse dataset.
    """
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_call_log_promote_service

    result = await get_call_log_promote_service().promote(db, call_log_id, data.label)

    if result.status == "rejected":
        if "does not exist" in result.message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.message,
            )
        if "LangFuse" in result.message:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=result.message,
            )

    return result


@router.delete(
    "/call-logs/{call_log_id}/promote-to-dataset",
    response_model=PromoteToDatasetResponse,
    summary="[Admin] Remove a call log from its LangFuse dataset (un-promote)",
)
async def unpromote_call_log_from_dataset(
    call_log_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> PromoteToDatasetResponse:
    """Remove a previously promoted call log from its LangFuse dataset.

    Clears the dataset item and resets promote-tracking fields.
    """
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_call_log_promote_service

    return await get_call_log_promote_service().unpromote(db, call_log_id)


@router.get(
    "/call-logs/{call_log_id}/promoted-status",
    summary="[Admin] Get promote status of a single call log",
)
async def get_call_log_promoted_status(
    call_log_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    """Return ``promoted_to`` field for a call log (golden / failure / null)."""
    from app.shared.llm_gateway.models.call_log import CallLog

    call_log = await db.get(CallLog, call_log_id)
    if call_log is None:
        raise HTTPException(status_code=404, detail="Call log not found")
    return {"call_log_id": call_log_id, "promoted_to": call_log.promoted_to}


class BatchPromoteRequest(BaseModel):
    """Body for batch promote endpoint."""

    ids: list[int]
    label: str  # "golden" | "failure"


class BatchPromoteResponse(BaseModel):
    """Result of a batch promote operation."""

    promoted: int
    skipped: int
    errors: int
    results: list[dict[str, Any]]


@router.post(
    "/call-logs/promote-batch",
    response_model=BatchPromoteResponse,
    summary="[Admin] Batch-promote call logs to LangFuse datasets",
)
async def promote_call_logs_batch(
    _admin: AdminUser,
    data: BatchPromoteRequest,
    db: AsyncSession = Depends(get_db),
) -> BatchPromoteResponse:
    """Promote multiple call log entries to a LangFuse dataset.

    Each item is independently promoted. Results are aggregated.
    """
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_call_log_promote_service

    promoted = 0
    skipped = 0
    errors = 0
    results: list[dict[str, Any]] = []

    for call_log_id in data.ids:
        result = await get_call_log_promote_service().promote(db, call_log_id, data.label)
        results.append(
            {
                "call_log_id": call_log_id,
                "status": result.status,
                "message": result.message,
            }
        )
        if result.status == "created":
            promoted += 1
        elif result.status in ("rejected", "duplicate"):
            skipped += 1
        else:
            errors += 1

    return BatchPromoteResponse(
        promoted=promoted,
        skipped=skipped,
        errors=errors,
        results=results,
    )


@router.get(
    "/call-logs/promoted",
    response_model=dict[str, Any],
    summary="[Admin] List call logs that have been promoted to datasets",
)
async def list_promoted_call_logs(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    task: str | None = Query(default=None, description="Filter by task key"),
    label: str | None = Query(default=None, description="Filter by label (golden/failure)"),
    limit: int = Query(default=100, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    """List call logs that have been promoted to LangFuse datasets.

    Returns paginated results with total count.
    """
    from sqlalchemy import func, select

    from app.shared.llm_gateway.models.call_log import CallLog

    base = select(CallLog).where(CallLog.promoted_at.isnot(None))
    count_stmt = select(func.count()).select_from(CallLog).where(CallLog.promoted_at.isnot(None))

    if task is not None:
        base = base.where(CallLog.task == task)
        count_stmt = count_stmt.where(CallLog.task == task)
    if label is not None:
        base = base.where(CallLog.promoted_to == label)
        count_stmt = count_stmt.where(CallLog.promoted_to == label)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    rows = (await db.execute(base.order_by(CallLog.promoted_at.desc()).offset(offset).limit(limit))).scalars().all()

    return {
        "items": [
            {
                "id": row.id,
                "task": row.task,
                "promoted_at": row.promoted_at.isoformat() if row.promoted_at else None,
                "promoted_to": row.promoted_to,
                "dataset_item_id": row.dataset_item_id,
            }
            for row in rows
        ],
        "total": total,
    }

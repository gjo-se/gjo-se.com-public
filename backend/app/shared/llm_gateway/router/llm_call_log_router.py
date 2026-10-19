"""Admin routes for the LLM call log: list, stats, purge, detail, retry."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service
from app.shared.llm_gateway.schemas.call_log_schemas import (
    CallLogOut,
    CallLogPaginatedResponse,
    CallPurgeOut,
    CallStatsOut,
    RetryBatchRequest,
    RetryBatchResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

# Obergrenze der Call-IDs pro Retry-Batch-Request.
_MAX_RETRY_BATCH_IDS = 100

router = APIRouter()


@router.get(
    "/call-logs",
    response_model=CallLogPaginatedResponse,
    response_model_exclude={"items": {"__all__": {"input_snapshot", "output_snapshot"}}},
    summary="[Admin] List recent LLM call-log entries",
)
async def list_call_logs(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None, description="Full-text search (ILIKE on task, model, credential, error)"),
    sort_by: str | None = Query(default=None, description="Column to sort by"),
    sort_order: str | None = Query(default="desc", description="Sort direction (asc/desc)"),
    error_type: str | None = Query(default=None, description="Exact error-type filter"),
    task: str | None = Query(default=None, description="Exact use-case filter"),
    only_errors: bool = Query(default=False, description="Return only failed calls"),
    retry_status: str | None = Query(
        default=None, description="Exact retry_status filter (dead, completed, pending, running)"
    ),
    promoted: str | None = Query(default=None, description="Filter by promoted_to: golden, failure"),
) -> CallLogPaginatedResponse:
    """Return a paginated, filterable list of LLM call-log rows (newest first).

    Args:
        _admin: Admin user guard.
        db: Async database session.
        limit: Maximum rows to return.
        offset: Row offset for pagination.
        error_type: Optional exact error-type filter.
        task: Optional exact task filter.
        only_errors: When True, only failed calls are returned.

    Returns:
        Paginated response with items and total count.
    """
    from app.shared.db_access.trace import trace

    trace("20_call_logs_query_start", limit=limit, offset=offset)
    rows, total = await get_llm_call_log_service().list_recent(
        db,
        limit=limit,
        offset=offset,
        q=q,
        sort_by=sort_by,
        sort_order=sort_order,
        error_type=error_type,
        task=task,
        only_errors=only_errors,
        retry_status=retry_status,
        promoted=promoted,
    )
    from app.shared.db_access.trace import trace

    trace("20_call_logs_query_done", rows=len(rows), total=total)
    return CallLogPaginatedResponse(
        items=[CallLogOut.model_validate(row) for row in rows],
        total=total,
    )


@router.get(
    "/call-logs/stats",
    response_model=CallStatsOut,
    summary="[Admin] Aggregate LLM call-log stats by error type",
)
async def call_log_stats(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    since: datetime | None = Query(
        default=None,
        description="Lower bound on created_at (ISO 8601, inclusive)",
    ),
) -> CallStatsOut:
    """Return total/success/error counts plus a per-error-type aggregation.

    Args:
        _admin: Admin user guard.
        db: Async database session.
        since: Optional lower bound on ``created_at``.

    Returns:
        Aggregated CallStatsOut.
    """
    return await get_llm_call_log_service().stats_by_error_type(db, since=since)


@router.post(
    "/call-logs/purge",
    response_model=CallPurgeOut,
    summary="[Admin] Purge call-log entries older than the retention window",
)
async def purge_call_logs(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> CallPurgeOut:
    """Delete call-log rows older than 14 days and return the deleted count.

    Args:
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        CallPurgeOut with the number of deleted rows.
    """
    deleted = await get_llm_call_log_service().purge_older_than(db)
    return CallPurgeOut(deleted=deleted)


@router.get(
    "/call-logs/{call_log_id}",
    response_model=CallLogOut,
    summary="[Admin] Get a single LLM call-log entry with input_snapshot",
)
async def get_call_log(
    call_log_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> CallLogOut:
    """Return a single call-log row including the input_snapshot for diagnostics.

    Args:
        call_log_id: Primary key of the call-log row.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        CallLogOut with ``input_snapshot`` populated.

    Raises:
        HTTPException 404: Row not found.
    """
    row = await get_llm_call_log_service().get_by_id(db, call_log_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call-log row {call_log_id} not found",
        )
    return CallLogOut.model_validate(row)


@router.post(
    "/call-logs/{call_log_id}/retry",
    response_model=CallLogOut,
    status_code=status.HTTP_200_OK,
    summary="[Admin] Retry a failed LLM call with its original input",
)
async def retry_call_log(
    call_log_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> CallLogOut:
    """Reproduce a failed LLM call identically using its stored input_snapshot.

    The original row must have an ``input_snapshot`` (any row created after
    this INC 2 deployment). The new row is linked to the original via
    ``retry_of_id``.

    Args:
        call_log_id: Primary key of the original (failed) call-log row.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        CallLogOut of the newly created retry row.

    Raises:
        HTTPException 404: Original row not found.
        HTTPException 400: Row has no ``input_snapshot``.
    """
    try:
        retry_row = await get_llm_call_log_service().retry_call_log(db, call_log_id)
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return CallLogOut.model_validate(retry_row)


@router.post(
    "/call-logs/retry-batch",
    response_model=RetryBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="[Admin] Enqueue a batch retry for multiple failed call-log rows",
)
async def retry_call_log_batch(
    body: RetryBatchRequest,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> RetryBatchResponse:
    """Enqueue an arq batch job that retries multiple call-log rows.

    Rows whose ``retry_status`` is ``dead`` are silently excluded from the
    batch.  The returned ``job_id`` can be polled via ``GET /tasks/{job_id}/progress``.

    Args:
        body: Request with a list of call-log ids (1…100).
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        RetryBatchResponse with the arq job id and queued count.
    """
    from app.shared.llm_gateway.models.call_log import CallRetryStatus
    from app.shared.workflow_runtime.infrastructure.restate.dispatch import enqueue_retry_batch

    if len(body.ids) < 1 or len(body.ids) > _MAX_RETRY_BATCH_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ids must contain between 1 and {_MAX_RETRY_BATCH_IDS} entries",
        )

    # Filter out dead entries (they are only retryable individually)
    alive_ids: list[int] = []
    for call_log_id in body.ids:
        row = await get_llm_call_log_service().get_by_id(db, call_log_id)
        if row is not None and row.retry_status != CallRetryStatus.DEAD.value:
            alive_ids.append(call_log_id)

    if not alive_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No retryable entries – all submitted ids are dead or missing",
        )

    job_id = await enqueue_retry_batch(alive_ids)
    return RetryBatchResponse(job_id=job_id, queued_count=len(alive_ids))

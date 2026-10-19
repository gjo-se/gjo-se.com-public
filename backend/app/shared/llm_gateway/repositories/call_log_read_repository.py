"""Read/query repository for the shared LLM call log (llm_gateway).

Owns the ORM→domain mapping (:func:`to_record`) and the querying reads of the
``shared_call_log`` aggregate: the reproducible snapshot lookup, the paginated
filtered listing, the error-type aggregation and the observer/audit count and
duration reads. Reads return :class:`CallLogRecord` domain objects (never ORM
models) so the service layer stays free of ``app.shared.llm_gateway.models``
imports (Achse 2: ``services`` > ``repositories``). The ``AsyncSession`` is
passed in by the caller (K3).

Split out of ``call_log_repository`` (God-File-Refactor, owner split): the
mutations live in ``call_log_write_repository`` and the isolated-session
recorder in ``call_log_recorder_repository``; ``call_log_repository`` re-exports
all of them so consumers keep importing
``app.shared.llm_gateway.repositories.call_log_repository`` unchanged.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.call_log_contract import CallLogRecord
from app.shared.llm_gateway.models.call_log import CallErrorType, CallLog
from app.shared.llm_gateway.schemas.call_log_schemas import CallStatsOut

#: Client sort-field label → ``shared_call_log`` column name (list endpoint).
_SORT_FIELD_MAP: dict[str, str] = {
    "projectId": "project_id",
    "task": "task",
    "trigger": "trigger",
    "model": "resolved_model",
    "credential": "resolved_credential",
    "duration": "duration_ms",
    "createdAt": "created_at",
}


def to_record(row: CallLog) -> CallLogRecord:
    """Maps a ``CallLog`` ORM row to its domain record.

    Args:
        row: The persisted call-log row.

    Returns:
        The record handed to the service layer.
    """
    return CallLogRecord(
        id=row.id,
        task=row.task,
        phase=row.phase,
        project_id=row.project_id,
        trigger=row.trigger,
        call_type=row.call_type,
        success=row.success,
        error_type=row.error_type,
        error_message=row.error_message,
        resolved_model=row.resolved_model,
        resolved_credential=row.resolved_credential,
        duration_ms=row.duration_ms,
        prompt_tokens=row.prompt_tokens,
        completion_tokens=row.completion_tokens,
        total_tokens=row.total_tokens,
        created_at=row.created_at,
        input_snapshot=row.input_snapshot,
        retry_of_id=row.retry_of_id,
        retry_count=row.retry_count,
        retry_status=row.retry_status,
        output_snapshot=row.output_snapshot,
        promoted_at=row.promoted_at,
        promoted_to=row.promoted_to,
        dataset_item_id=row.dataset_item_id,
    )


async def list_recent_with_input(db: AsyncSession, task_key: str, limit: int) -> list[CallLogRecord]:
    """Returns the most recent successful logs carrying an ``input_snapshot``.

    Args:
        db: Active async database session.
        task_key: Task registry key to filter call logs by.
        limit: Maximum number of rows to return.

    Returns:
        Records ordered newest-first that carry a reproducible input snapshot.
    """
    stmt = (
        select(CallLog)
        .where(
            CallLog.task == task_key,
            CallLog.success.is_(True),
            CallLog.input_snapshot.isnot(None),
        )
        .order_by(desc(CallLog.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [to_record(row) for row in result.scalars().all()]


async def list_recent(
    db: AsyncSession,
    *,
    limit: int = 50,
    offset: int = 0,
    q: str | None = None,
    sort_by: str | None = None,
    sort_order: str | None = None,
    error_type: str | None = None,
    task: str | None = None,
    only_errors: bool = False,
    retry_status: str | None = None,
    promoted: str | None = None,
) -> tuple[list[CallLogRecord], int]:
    """Returns a paginated, filterable list of call-log rows with total count."""
    base = select(CallLog)
    count_stmt = select(func.count()).select_from(CallLog)

    if q:
        ilike = f"%{q}%"
        search_filter = (
            CallLog.task.ilike(ilike)
            | CallLog.resolved_model.ilike(ilike)
            | CallLog.resolved_credential.ilike(ilike)
            | CallLog.error_type.ilike(ilike)
        )
        base = base.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    if only_errors:
        base = base.where(CallLog.success.is_(False))
        count_stmt = count_stmt.where(CallLog.success.is_(False))
    if error_type is not None:
        base = base.where(CallLog.error_type == error_type)
        count_stmt = count_stmt.where(CallLog.error_type == error_type)
    if task is not None:
        base = base.where(CallLog.task == task)
        count_stmt = count_stmt.where(CallLog.task == task)
    if retry_status is not None:
        base = base.where(CallLog.retry_status == retry_status)
        count_stmt = count_stmt.where(CallLog.retry_status == retry_status)
    if promoted is not None and promoted != "":
        if promoted == "any":
            base = base.where(CallLog.promoted_at.isnot(None))
            count_stmt = count_stmt.where(CallLog.promoted_at.isnot(None))
        else:
            base = base.where(CallLog.promoted_to == promoted)
            count_stmt = count_stmt.where(CallLog.promoted_to == promoted)

    if sort_by:
        db_col = _SORT_FIELD_MAP.get(sort_by)
        if db_col:
            col = getattr(CallLog, db_col)
            stmt = base.order_by(col.asc() if sort_order == "asc" else col.desc())
        else:
            stmt = base.order_by(CallLog.created_at.desc())
    else:
        stmt = base.order_by(CallLog.created_at.desc())
    stmt = stmt.offset(offset).limit(limit)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    result = await db.execute(stmt)
    return [to_record(row) for row in result.scalars().all()], total


async def stats_by_error_type(
    db: AsyncSession,
    *,
    since: datetime | None = None,
) -> CallStatsOut:
    """Aggregates call counts (total/success/errors + per error type)."""
    base = select(CallLog.success, func.count()).group_by(CallLog.success)
    if since is not None:
        base = base.where(CallLog.created_at >= since)
    success_count = 0
    error_count = 0
    for is_success, count in (await db.execute(base)).all():
        if is_success is True:
            success_count = count
        else:
            error_count = count

    err_stmt = select(CallLog.error_type, func.count()).where(CallLog.success.is_(False)).group_by(CallLog.error_type)
    if since is not None:
        err_stmt = err_stmt.where(CallLog.created_at >= since)
    by_error_type = {
        (error_type or CallErrorType.UNKNOWN.value): count for error_type, count in (await db.execute(err_stmt)).all()
    }

    return CallStatsOut(
        total=success_count + error_count,
        success=success_count,
        errors=error_count,
        by_error_type=by_error_type,
    )


async def count_calls(
    db: AsyncSession,
    *,
    task: str,
    since: datetime,
    error_type: str | None = None,
    retry_status: str | None = None,
    pending: bool = False,
) -> int:
    """Counts call-log rows for *task* since *since* with optional extra filters."""
    stmt = select(CallLog.id).where(
        CallLog.task == task,
        CallLog.created_at >= since,
    )
    if error_type is not None:
        stmt = stmt.where(CallLog.error_type == error_type)
    if retry_status is not None:
        stmt = stmt.where(CallLog.retry_status == retry_status)
    if pending:
        stmt = stmt.where(
            CallLog.success.is_(None),
            CallLog.error_type.is_(None),
            CallLog.duration_ms.is_(None),
        )
    result = await db.execute(stmt)
    return len(result.all())


async def list_recent_durations(
    db: AsyncSession,
    *,
    task: str,
    since: datetime,
) -> list[int]:
    """Returns the ``duration_ms`` values of recent successful calls for *task*."""
    rows = (
        await db.execute(
            select(CallLog.duration_ms)
            .where(
                CallLog.task == task,
                CallLog.created_at >= since,
                CallLog.success == True,  # noqa: E712
                CallLog.duration_ms.isnot(None),
            )
            .order_by(desc(CallLog.created_at))
        )
    ).all()
    return [row[0] for row in rows if row[0] is not None]

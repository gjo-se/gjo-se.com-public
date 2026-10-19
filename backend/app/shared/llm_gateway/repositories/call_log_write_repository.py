"""Write/mutation repository for the shared LLM call log (llm_gateway).

Owns the caller-session mutations of the ``shared_call_log`` aggregate:
retention purge, retry-row creation, DLQ marking and the promotion-tracking
fields. Writes that return a record map through
:func:`app.shared.llm_gateway.repositories.call_log_read_repository.to_record`.
The ``AsyncSession`` is passed in by the caller (K3); the isolated-session
recorder lives in ``call_log_recorder_repository``.

Split out of ``call_log_repository`` (God-File-Refactor, owner split);
``call_log_repository`` re-exports these functions so consumers keep importing
``app.shared.llm_gateway.repositories.call_log_repository`` unchanged.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, cast

import structlog
from sqlalchemy import CursorResult, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.call_log_contract import CallLogRecord
from app.shared.llm_gateway.models.call_log import CallLog, CallRetryStatus
from app.shared.llm_gateway.repositories import call_log_read_repository

logger = structlog.get_logger(__name__)


async def purge_older_than(db: AsyncSession, *, days: int) -> int:
    """Deletes log rows older than *days* and returns the number removed."""
    cutoff = datetime.now(UTC) - timedelta(days=days)
    result = await db.execute(
        delete(CallLog).where(
            CallLog.created_at < cutoff,
            CallLog.promoted_to.is_(None),  # Never purge golden/error dataset items
        ),
    )
    await db.commit()
    deleted = cast(CursorResult[Any], result).rowcount or 0
    logger.info("llm_call_log: purged %d row(s) older than %d day(s)", deleted, days)
    return deleted


async def create_retry(
    db: AsyncSession,
    *,
    task: str,
    project_id: int | None,
    trigger: str,
    call_type: str,
    success: bool,
    error_type: str | None,
    resolved_model: str | None,
    resolved_credential: str | None,
    input_snapshot: dict[str, Any],
    retry_of_id: int,
    retry_count: int,
    retry_status: str,
) -> CallLogRecord:
    """Persists a new retry call-log row linked to the original and returns it."""
    retry_log = CallLog(
        task=task,
        project_id=project_id,
        trigger=trigger,
        call_type=call_type,
        success=success,
        error_type=error_type,
        error_message=None if success else str(error_type or ""),
        resolved_model=resolved_model,
        resolved_credential=resolved_credential,
        duration_ms=None,
        input_snapshot=input_snapshot,
        retry_of_id=retry_of_id,
        retry_count=retry_count,
        retry_status=retry_status,
    )
    db.add(retry_log)
    await db.commit()
    await db.refresh(retry_log)
    return call_log_read_repository.to_record(retry_log)


async def mark_dead(db: AsyncSession, call_log_id: int) -> CallLogRecord | None:
    """Marks a call-log row with ``retry_status=dead`` (DLQ hand-off)."""
    original = (await db.execute(select(CallLog).where(CallLog.id == call_log_id))).scalar_one_or_none()
    if original is None:
        return None
    original.retry_status = CallRetryStatus.DEAD.value
    await db.commit()
    logger.info("llm_call_log: marked call_log=%d as dead (DLQ)", call_log_id)
    return call_log_read_repository.to_record(original)


async def set_promotion(
    db: AsyncSession,
    call_log_id: int,
    *,
    promoted_at: datetime,
    promoted_to: str,
    dataset_item_id: str | None,
) -> None:
    """Persists the promotion-tracking fields on the call-log row."""
    row = await db.get(CallLog, call_log_id)
    if row is None:
        return
    row.promoted_at = promoted_at
    row.promoted_to = promoted_to
    row.dataset_item_id = dataset_item_id
    await db.commit()


async def clear_promotion(db: AsyncSession, call_log_id: int) -> None:
    """Clears the promotion-tracking fields on the call-log row."""
    row = await db.get(CallLog, call_log_id)
    if row is None:
        return
    row.promoted_at = None
    row.promoted_to = None
    row.dataset_item_id = None
    await db.commit()

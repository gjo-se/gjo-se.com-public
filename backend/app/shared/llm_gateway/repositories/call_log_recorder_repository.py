"""Isolated-session recorder for the shared LLM call log (llm_gateway).

Owns the log-lifecycle writes that open their **own** session
(:func:`find_pending` / :func:`record` / :func:`complete`) so a log write can
never roll back or interfere with the transaction of the LLM call that
triggered it (Achse 2: ``services`` > ``repositories``).

Split out of ``call_log_repository`` (God-File-Refactor, owner split);
``call_log_repository`` re-exports these functions so consumers keep importing
``app.shared.llm_gateway.repositories.call_log_repository`` unchanged.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.models.call_log import CallLog

logger = structlog.get_logger(__name__)


async def find_pending(
    *,
    task: str,
    project_id: int | None = None,
    phase: str | None = None,
) -> int | None:
    """Returns the id of a recent call-log row for deduplication, or ``None``.

    Searches for ANY row (pending OR completed) created within the last 120
    seconds so a Restate replay still finds the original row.
    """
    try:
        cutoff = datetime.now(UTC) - timedelta(seconds=120)
        async with AsyncSessionLocal() as session:
            stmt = (
                select(CallLog.id)
                .where(
                    CallLog.task == task,
                    CallLog.created_at >= cutoff,
                )
                .order_by(CallLog.id.desc())
                .limit(1)
            )
            if project_id is not None:
                stmt = stmt.where(CallLog.project_id == project_id)
            if phase is not None:
                stmt = stmt.where(CallLog.phase == phase)
            result = await session.execute(stmt)
            return result.scalar_one_or_none()
    except Exception:
        logger.exception("llm_call_log: find_pending failed for task=%s", task)
        return None


async def record(
    *,
    task: str,
    call_type: str,
    success: bool | None = None,
    project_id: int | None = None,
    phase: str | None = None,
    trigger: str | None = None,
    error_type: str | None = None,
    error_message: str | None = None,
    resolved_model: str | None = None,
    resolved_credential: str | None = None,
    duration_ms: int | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    total_tokens: int | None = None,
    input_snapshot: dict[str, Any] | None = None,
    retry_of_id: int | None = None,
    retry_count: int = 0,
    retry_status: str | None = None,
    output_snapshot: str | None = None,
) -> int | None:
    """Writes exactly one call-log row using an isolated DB session.

    A dedicated session is opened here so that persisting the log entry can
    never roll back or interfere with the transaction of the (possibly failed)
    LLM call that triggered it. Errors while logging are swallowed (logged only)
    so instrumentation can never break a real call path.

    Returns:
        The ``id`` of the newly created row, or ``None`` on failure.
    """
    try:
        async with AsyncSessionLocal() as session:
            log = CallLog(
                task=task,
                phase=phase,
                project_id=project_id,
                trigger=trigger,
                call_type=call_type,
                success=success,
                error_type=error_type,
                error_message=error_message,
                resolved_model=resolved_model,
                resolved_credential=resolved_credential,
                duration_ms=duration_ms,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                input_snapshot=input_snapshot,
                retry_of_id=retry_of_id,
                retry_count=retry_count,
                retry_status=retry_status,
                output_snapshot=output_snapshot,
            )
            session.add(log)
            await session.commit()
            await session.refresh(log)
            return log.id
    except Exception:
        logger.exception("llm_call_log: failed to record log entry for task=%s", task)
        return None


async def complete(
    call_log_id: int,
    *,
    success: bool,
    error_type: str | None = None,
    error_message: str | None = None,
    duration_ms: int | None = None,
    output_snapshot: str | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    total_tokens: int | None = None,
) -> None:
    """Updates an existing pending call-log row with the final outcome.

    The row must have been created by :func:`record` with ``success=None``.
    Only the outcome fields are updated; all other columns are left as-is.
    """
    try:
        async with AsyncSessionLocal() as session:
            log = await session.get(CallLog, call_log_id)
            if log is None:
                logger.warning("llm_call_log: complete called for unknown id=%d", call_log_id)
                return
            log.success = success
            log.duration_ms = duration_ms
            log.prompt_tokens = prompt_tokens
            log.completion_tokens = completion_tokens
            log.total_tokens = total_tokens
            if output_snapshot is not None:
                log.output_snapshot = output_snapshot
            if error_type is not None:
                log.error_type = error_type
            if error_message is not None:
                log.error_message = error_message
            await session.commit()
    except Exception:
        logger.exception("llm_call_log: failed to complete log entry id=%d", call_log_id)

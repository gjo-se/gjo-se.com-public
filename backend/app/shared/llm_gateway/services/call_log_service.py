"""Service for the central LLM call log.

Provides recording (with an isolated DB session so a log write never rolls back
a failed call), paginated/filterable listing, error-type aggregation,
retention purge, and retry orchestration. The DB access lives in
:mod:`...repositories.call_log_repository`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.call_log_contract import CallLogRecord
from app.shared.llm_gateway.domain.task_registry_rules import SkillExtractionTrigger
from app.shared.llm_gateway.repositories import call_log_repository
from app.shared.llm_gateway.schemas.call_log_schemas import CallStatsOut

logger = structlog.get_logger(__name__)

_DEFAULT_RETENTION_DAYS = 14
_MAX_RETRY_COUNT = 3

_RETRY_STATUS_DEAD = "dead"
_RETRY_STATUS_COMPLETED = "completed"


class CallLogService:
    """Persistence and querying for ``CallLog`` rows."""

    async def find_pending(
        self,
        *,
        task: str,
        project_id: int | None = None,
        phase: str | None = None,
    ) -> int | None:
        """Return the id of a recent call-log row for deduplication, or ``None``.

        Used by ``ActTracker`` to make ``log_act_start`` idempotent across
        Restate workflow replays – on resume, ``__aenter__`` runs again but
        must reuse the original row instead of creating a duplicate.

        Searches for ANY row (pending OR completed) created within the last
        120 seconds so that a Restate replay (where the original row is
        already ``success IS NOT NULL``) still finds it.
        """
        return await call_log_repository.find_pending(task=task, project_id=project_id, phase=phase)

    async def record(
        self,
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
        """Write exactly one call-log row using an isolated DB session.

        A dedicated session is opened by the repository so that persisting the
        log entry can never roll back or interfere with the transaction of the
        (possibly failed) LLM call that triggered it. Errors while logging are
        swallowed (logged only) so instrumentation can never break a real call
        path.

        Args:
            task: Task identifier.
            call_type: Invocation kind (``structured``/``text``/``stream``).
            success: Whether the call succeeded.
            project_id: Optional originating project id.
            trigger: Optional trigger label.
            error_type: Standardised error classification (failures only).
            error_message: Human-readable error detail (failures only).
            resolved_model: Resolved model identifier (when known).
            resolved_credential: Resolved credential service label (when known).
            duration_ms: Wall-clock duration in milliseconds.
            prompt_tokens: Number of input tokens (when provided by the provider).
            completion_tokens: Number of output tokens (when provided by the provider).
            total_tokens: Total tokens used by the call.
            input_snapshot: Reproducible input dict for retry (INC 2).
            retry_of_id: FK to original call-log row this retry belongs to.
            retry_count: 0 for originals, 1..N for retries.
            retry_status: Lifecycle status (PENDING|RUNNING|COMPLETED|DEAD).

        Returns:
            The ``id`` of the newly created row, or ``None`` on failure.
        """
        return await call_log_repository.record(
            task=task,
            phase=phase,
            project_id=project_id,
            trigger=trigger,
            call_type=call_type,
            success=success,
            error_type=None if error_type is None else str(error_type),
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

    @staticmethod
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
        """Update an existing pending call-log row with the final outcome.

        The row must have been created by :meth:`record` with ``success=None``.
        Only the outcome fields are updated; all other columns are left as-is.

        Args:
            call_log_id: The id of the pending row to finalise.
            success: ``True`` if the call succeeded.
            error_type: Standardised error classification (failures only).
            error_message: Human-readable error detail (failures only).
            duration_ms: Wall-clock duration in milliseconds.
            prompt_tokens: Number of input tokens (when provided by the provider).
            completion_tokens: Number of output tokens (when provided by the provider).
            total_tokens: Total tokens used by the call.
        """
        await call_log_repository.complete(
            call_log_id,
            success=success,
            error_type=None if error_type is None else str(error_type),
            error_message=error_message,
            duration_ms=duration_ms,
            output_snapshot=output_snapshot,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )

    @staticmethod
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
        """Return a paginated, filterable list of call-log rows with total count.

        Args:
            db: Active async database session.
            limit: Maximum rows to return.
            offset: Row offset for pagination.
            error_type: Optional exact error-type filter.
            task: Optional exact task filter.
            only_errors: When True, only failed calls are returned.
            retry_status: Optional exact retry_status filter (dead, completed, etc.).

        Returns:
            Tuple of (matching records, total count before pagination).
        """
        return await call_log_repository.list_recent(
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

    @staticmethod
    async def stats_by_error_type(
        db: AsyncSession,
        *,
        since: datetime | None = None,
    ) -> CallStatsOut:
        """Aggregate call counts (total/success/errors + per error type).

        Args:
            db: Active async database session.
            since: Optional lower bound on ``created_at`` (inclusive).

        Returns:
            Aggregated :class:`CallStatsOut`.
        """
        return await call_log_repository.stats_by_error_type(db, since=since)

    @staticmethod
    async def purge_older_than(db: AsyncSession, *, days: int = _DEFAULT_RETENTION_DAYS) -> int:
        """Delete log rows older than *days* and return the number removed.

        Args:
            db: Active async database session.
            days: Retention window in days.

        Returns:
            Number of deleted rows.
        """
        return await call_log_repository.purge_older_than(db, days=days)

    @staticmethod
    async def get_by_id(db: AsyncSession, call_log_id: int) -> CallLogRecord | None:
        """Return a single call-log row by primary key, or ``None``.

        Args:
            db: Active async database session.
            call_log_id: Primary key of the requested row.

        Returns:
            The matching call-log record, or ``None`` if not found.
        """
        return await call_log_repository.get_by_id(db, call_log_id)

    @staticmethod
    async def retry_call_log(db: AsyncSession, call_log_id: int) -> CallLogRecord:
        """Reproduce a failed call identically via the generic task executor.

        Loads the original log row, extracts the ``input_snapshot``, and
        re-executes the task through ``TaskExecutorService.execute_task()``.
        Writes a new log row linked to the original via ``retry_of_id``.

        Args:
            db: Active async database session.
            call_log_id: Primary key of the original (failed) call-log row.

        Returns:
            The newly created call-log record.

        Raises:
            ValueError: The original row has no ``input_snapshot``.
            LookupError: The original row was not found.
        """
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service

        original = await call_log_repository.get_by_id(db, call_log_id)
        if original is None:
            raise LookupError(f"Call-log row {call_log_id} not found")

        if original.error_type is None:
            logger.info("retry_call_log: skipping already-successful call_log=%d", call_log_id)
            return original

        if not original.input_snapshot:
            raise ValueError(f"Call-log row {call_log_id} has no input_snapshot – retry not possible")

        snapshot: dict[str, Any] = original.input_snapshot
        variables: dict[str, str] = snapshot.get("variables", {})
        project_id: int | None = original.project_id

        result = await get_task_executor_service().execute_task(
            db=db,
            task_key=original.task,
            variables=variables,
            project_id=project_id,
            trigger=SkillExtractionTrigger.MANUAL_RETRY,
        )

        next_retry_count = original.retry_count + 1
        retry_status = _RETRY_STATUS_DEAD if next_retry_count >= _MAX_RETRY_COUNT else _RETRY_STATUS_COMPLETED

        return await call_log_repository.create_retry(
            db,
            task=original.task,
            project_id=project_id,
            trigger=SkillExtractionTrigger.MANUAL_RETRY.value,
            call_type=original.call_type,
            success=result["success"],
            error_type=None if result["success"] else str(result.get("error_type", "")),
            resolved_model=original.resolved_model,
            resolved_credential=original.resolved_credential,
            input_snapshot=original.input_snapshot,
            retry_of_id=original.id,
            retry_count=next_retry_count,
            retry_status=retry_status if not result["success"] else _RETRY_STATUS_COMPLETED,
        )

    @staticmethod
    async def mark_dead(db: AsyncSession, call_log_id: int) -> CallLogRecord | None:
        """Mark a call-log row with ``retry_status=dead`` (DLQ hand-off).

        Idempotent – if the row is already dead or does not exist, returns
        silently.

        Args:
            db: Active async database session.
            call_log_id: Primary key of the row to mark.

        Returns:
            The updated call-log record, or ``None`` if not found.
        """
        return await call_log_repository.mark_dead(db, call_log_id)

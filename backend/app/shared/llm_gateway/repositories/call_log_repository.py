"""Database access for the shared LLM call log (llm_gateway).

Stable entry point for the ``shared_call_log`` aggregate: hosts the single/batch
by-id reads and re-exports the split-out call-log repositories
(``call_log_read_repository`` = mapper + queries, ``call_log_write_repository`` =
mutations, ``call_log_recorder_repository`` = isolated-session recorder) so
consumers keep importing
``app.shared.llm_gateway.repositories.call_log_repository`` unchanged.

Read operations return :class:`CallLogRecord` domain objects (never ORM models)
so the service layer stays free of ``app.shared.llm_gateway.models`` imports
(Achse 2: ``services`` > ``repositories``).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.call_log_contract import CallLogRecord
from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.repositories.call_log_read_repository import (
    count_calls,
    list_recent,
    list_recent_durations,
    list_recent_with_input,
    stats_by_error_type,
    to_record,
)
from app.shared.llm_gateway.repositories.call_log_recorder_repository import (
    complete,
    find_pending,
    record,
)
from app.shared.llm_gateway.repositories.call_log_write_repository import (
    clear_promotion,
    create_retry,
    mark_dead,
    purge_older_than,
    set_promotion,
)

__all__ = [
    "clear_promotion",
    "complete",
    "count_calls",
    "create_retry",
    "find_pending",
    "get_by_id",
    "list_by_ids",
    "list_recent",
    "list_recent_durations",
    "list_recent_with_input",
    "mark_dead",
    "purge_older_than",
    "record",
    "set_promotion",
    "stats_by_error_type",
    "to_record",
]


async def get_by_id(db: AsyncSession, call_log_id: int) -> CallLogRecord | None:
    """Returns a single call-log row by primary key as a record, or ``None``."""
    row = (await db.execute(select(CallLog).where(CallLog.id == call_log_id))).scalar_one_or_none()
    return to_record(row) if row is not None else None


async def list_by_ids(db: AsyncSession, call_log_ids: list[int]) -> list[CallLogRecord]:
    """Returns the call-log rows whose ids are in *call_log_ids* as records."""
    if not call_log_ids:
        return []
    stmt = select(CallLog).where(CallLog.id.in_(call_log_ids))
    result = await db.execute(stmt)
    return [to_record(row) for row in result.scalars().all()]

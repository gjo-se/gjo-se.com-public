"""Database access for observer metrics (llm_gateway).

Reads return plain data (:class:`CallLogRecord` rows / ``dict`` aggregates) so
the service layer stays free of ``app.shared.llm_gateway.models`` imports
(Achse 2: ``services`` > ``repositories``). The ``AsyncSession`` is passed in
by the caller (K3).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.call_log_contract import CallLogRecord
from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.models.enums import TicketStatus
from app.shared.llm_gateway.models.observer_ticket import ObserverTicket
from app.shared.llm_gateway.repositories.call_log_repository import to_record

_OPEN_STATUSES = [TicketStatus.OPEN.value, TicketStatus.ACKNOWLEDGED.value, TicketStatus.IN_PROGRESS.value]


async def list_call_logs_since(db: AsyncSession, cutoff: datetime) -> list[CallLogRecord]:
    """Returns call-log rows with a duration since *cutoff* as records."""
    stmt = select(CallLog).where(
        CallLog.created_at >= cutoff,
        CallLog.duration_ms.is_not(None),
    )
    result = await db.execute(stmt)
    return [to_record(row) for row in result.scalars().all()]


async def ticket_counts_by_task(db: AsyncSession) -> dict[str, int]:
    """Returns {task: count} of open observer tickets."""
    stmt = (
        select(ObserverTicket.task, func.count(ObserverTicket.id))
        .where(ObserverTicket.status.in_(_OPEN_STATUSES))
        .group_by(ObserverTicket.task)
    )
    result = await db.execute(stmt)
    return {row.task: row[1] for row in result.all()}

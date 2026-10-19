"""Database access for observer tickets (llm_gateway).

Read/write operations return :class:`ObserverTicketRecord` domain objects (never
ORM models) so the service layer stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``). The ``AsyncSession`` is passed in by the caller (K3).
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

import structlog
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.observer_ticket_contract import ObserverTicketRecord
from app.shared.llm_gateway.models.enums import TicketStatus
from app.shared.llm_gateway.models.observer_ticket import ObserverTicket
from app.shared.llm_gateway.models.observer_ticket_call_log import ObserverTicketCallLog
from app.shared.llm_gateway.schemas.observer_schemas import ObserverTicketCreate

logger = structlog.get_logger(__name__)

_OPEN_STATUSES = {TicketStatus.OPEN, TicketStatus.ACKNOWLEDGED, TicketStatus.IN_PROGRESS}


def _as_str(value: object) -> str:
    """Returns the string value of a str-enum or plain string."""
    return value.value if isinstance(value, StrEnum) else str(value)


def _to_record(row: ObserverTicket) -> ObserverTicketRecord:
    """Maps an ``ObserverTicket`` ORM row to its domain record."""
    return ObserverTicketRecord(
        id=row.id,
        ticket_type=_as_str(row.ticket_type),
        severity=_as_str(row.severity),
        task=row.task,
        anomaly_details=row.anomaly_details,
        diagnosis=row.diagnosis,
        langfuse_trace_url=row.langfuse_trace_url,
        status=_as_str(row.status),
        created_at=row.created_at,
        resolved_at=row.resolved_at,
    )


async def create(db: AsyncSession, data: ObserverTicketCreate) -> ObserverTicketRecord:
    """Persists a new observer ticket in the OPEN state."""
    ticket = ObserverTicket(
        ticket_type=data.ticket_type,  # type: ignore[arg-type]
        severity=data.severity,  # type: ignore[arg-type]
        task=data.task,
        anomaly_details=data.anomaly_details,
        diagnosis=data.diagnosis,
        langfuse_trace_url=data.langfuse_trace_url,
        status=TicketStatus.OPEN,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    logger.info("Observer ticket created: id=%d, task=%s, type=%s", ticket.id, ticket.task, ticket.ticket_type)
    return _to_record(ticket)


async def get_open(db: AsyncSession, task: str | None = None) -> list[ObserverTicketRecord]:
    """Returns all open tickets, optionally filtered by task, newest first."""
    stmt = select(ObserverTicket).where(ObserverTicket.status.in_(_OPEN_STATUSES))
    if task:
        stmt = stmt.where(ObserverTicket.task == task)
    stmt = stmt.order_by(ObserverTicket.created_at.desc())
    result = await db.execute(stmt)
    return [_to_record(row) for row in result.scalars().all()]


async def find_open_by_task_and_type(
    db: AsyncSession,
    task: str,
    ticket_type: str,
) -> ObserverTicketRecord | None:
    """Returns an open ticket for *(task, ticket_type)*, or ``None``."""
    stmt = (
        select(ObserverTicket)
        .where(
            ObserverTicket.task == task,
            ObserverTicket.ticket_type == ticket_type,  # type: ignore[arg-type]
            ObserverTicket.status.in_(_OPEN_STATUSES),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    return _to_record(row) if row is not None else None


async def _set_status(
    db: AsyncSession,
    ticket_id: int,
    *,
    status: TicketStatus,
    resolved_at: datetime | None = None,
) -> ObserverTicketRecord:
    """Sets the status (and optional ``resolved_at``) on a ticket.

    Raises:
        ValueError: No ticket found with the given id.
    """
    ticket = await db.get(ObserverTicket, ticket_id)
    if ticket is None:
        raise ValueError(f"Ticket nicht gefunden: {ticket_id}")
    ticket.status = status
    if resolved_at is not None:
        ticket.resolved_at = resolved_at
    await db.commit()
    await db.refresh(ticket)
    return _to_record(ticket)


async def acknowledge(db: AsyncSession, ticket_id: int) -> ObserverTicketRecord:
    """Sets a ticket's status to ``acknowledged``."""
    return await _set_status(db, ticket_id, status=TicketStatus.ACKNOWLEDGED)


async def set_in_progress(db: AsyncSession, ticket_id: int) -> ObserverTicketRecord:
    """Sets a ticket's status to ``in_progress``."""
    return await _set_status(db, ticket_id, status=TicketStatus.IN_PROGRESS)


async def resolve(db: AsyncSession, ticket_id: int, *, resolved_at: datetime) -> ObserverTicketRecord:
    """Sets a ticket's status to ``resolved`` and records ``resolved_at``."""
    return await _set_status(db, ticket_id, status=TicketStatus.RESOLVED, resolved_at=resolved_at)


async def dismiss(db: AsyncSession, ticket_id: int, *, resolved_at: datetime) -> ObserverTicketRecord:
    """Sets a ticket's status to ``dismissed`` and records ``resolved_at``."""
    return await _set_status(db, ticket_id, status=TicketStatus.DISMISSED, resolved_at=resolved_at)


async def link_call_log(db: AsyncSession, ticket_id: int, call_log_id: int) -> None:
    """Associates a call log with a ticket (idempotent).

    Raises:
        ValueError: The ticket does not exist.
    """
    ticket = await db.get(ObserverTicket, ticket_id)
    if ticket is None:
        raise ValueError(f"Ticket nicht gefunden: {ticket_id}")
    link = ObserverTicketCallLog(
        observer_ticket_id=ticket_id,
        llm_call_log_id=call_log_id,
    )
    db.add(link)
    try:
        await db.commit()
        logger.info(
            "observer_ticket_repository: linked ticket_id=%d → call_log_id=%d",
            ticket_id,
            call_log_id,
        )
    except IntegrityError:
        await db.rollback()
        logger.debug(
            "observer_ticket_repository: link already exists ticket_id=%d call_log_id=%d – skipped",
            ticket_id,
            call_log_id,
        )


async def list_linked_call_log_ids(db: AsyncSession, ticket_id: int) -> list[int]:
    """Returns the call-log ids linked to a ticket."""
    stmt = select(ObserverTicketCallLog.llm_call_log_id).where(
        ObserverTicketCallLog.observer_ticket_id == ticket_id,
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

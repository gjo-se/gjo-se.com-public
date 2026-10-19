"""SQLAlchemy model for observer-generated LLM performance tickets.

One row per detected anomaly (latency, error spike, cost overrun).
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.llm_gateway.models.enums import TicketSeverity, TicketStatus, TicketType

if TYPE_CHECKING:
    from app.shared.llm_gateway.models.observer_ticket_call_log import ObserverTicketCallLog


class ObserverTicket(Base):
    """Observer-generated ticket for an LLM performance anomaly.

    Created by the ``run_observer`` arq Cron Job when a monitored metric
    (latency, error rate, cost) exceeds its baseline threshold. Each ticket
    links to the affected LangFuse trace for drill-down analysis.

    Attributes:
        id: Primary key.
        ticket_type: Classification of the anomaly.
        severity: Severity level derived from the threshold crossing.
        task: LLM task identifier (e.g. ``"description-merge"``).
        anomaly_details: JSON with baseline, current, threshold, and
            affected trace IDs.
        diagnosis: Human-readable summary of the detected problem.
        langfuse_trace_url: Deep-link to the LangFuse trace for analysis.
        status: Current lifecycle state (open → resolved/dismissed).
        created_at: Timestamp when the ticket was created.
        resolved_at: Timestamp when the ticket was resolved/dismissed.
    """

    __tablename__ = "shared_observer_ticket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_type: Mapped[TicketType] = mapped_column(String(50), nullable=False, default=TicketType.LATENCY_ANOMALY)
    severity: Mapped[TicketSeverity] = mapped_column(String(20), nullable=False, default=TicketSeverity.WARNING)
    task: Mapped[str] = mapped_column(String(100), nullable=False)
    anomaly_details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    langfuse_trace_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[TicketStatus] = mapped_column(String(20), nullable=False, default=TicketStatus.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    call_log_links: Mapped[list[ObserverTicketCallLog]] = relationship(
        "ObserverTicketCallLog",
        back_populates="observer_ticket",
        lazy="noload",
    )

"""SQLAlchemy junction model linking observer tickets to LLM call logs.

n:m relationship – one ticket can be associated with multiple failed calls,
and one call log can appear in multiple tickets. Used for batch-promote
suggestions when a ticket is resolved.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.shared.llm_gateway.models.call_log import CallLog
    from app.shared.llm_gateway.models.observer_ticket import ObserverTicket


class ObserverTicketCallLog(Base):
    """Junction table: shared_observer_ticket <-> shared_call_log.

    Composite primary key ensures each (ticket, call_log) pair is unique.
    CASCADE delete on both sides – removing a ticket or call log cleans up
    the link automatically.

    Attributes:
        observer_ticket_id: FK to :class:`ObserverTicket`.
        llm_call_log_id: FK to :class:`CallLog`.
    """

    __tablename__ = "shared_observer_ticket_call_log"
    __table_args__ = (PrimaryKeyConstraint("observer_ticket_id", "llm_call_log_id"),)

    observer_ticket_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_observer_ticket.id", ondelete="CASCADE"),
        nullable=False,
    )
    llm_call_log_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_call_log.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    observer_ticket: Mapped[ObserverTicket] = relationship(
        "ObserverTicket",
        back_populates="call_log_links",
        lazy="noload",
    )
    llm_call_log: Mapped[CallLog] = relationship("CallLog", lazy="noload")

"""SQLAlchemy-Modell fuer Communication (Kommunikationsverlauf, gjo_se_com).

Der Verlauf haengt an genau einem ``application_submission`` (ON DELETE CASCADE).
Tags laufen ueber die polymorphe ``core_taggable``-Junction mit
``taggable_type='application_communication'``.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    and_,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin
from app.shared.tagging.models.tag import Tag, Taggable

if TYPE_CHECKING:
    from app.application.models.submission import Submission


class CommunicationType(StrEnum):
    """Kommunikationskanal."""

    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    NOTE = "note"


class CommunicationDirection(StrEnum):
    """Richtung der Kommunikation."""

    INBOUND = "inbound"
    OUTBOUND = "outbound"
    INTERNAL = "internal"


class CommunicationOutcome(StrEnum):
    """Ergebnis der Kommunikation."""

    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    NO_ANSWER = "no_answer"
    FOLLOW_UP_NEEDED = "follow_up_needed"


class CommunicationSentiment(StrEnum):
    """Sentiment-Analyse (manuell)."""

    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class Communication(TimestampMixin, Base):
    """Kommunikationsverlauf zu einem Bewerbungsvorgang.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        application_submission_id: FK zum Vorgang (ON DELETE CASCADE).
        type: Kommunikationskanal (call, email, meeting, note).
        direction: Richtung (inbound, outbound, internal).
        subject: Betreff (optional).
        date: Datum/Zeitpunkt der Kommunikation.
        summary: Zusammenfassung / Notiz.
        outcome: Ergebnis (Enum-Wert als String).
        next_steps: Naechste Schritte.
        follow_up_date: Wiedervorlage-Datum.
        follow_up_done: Wiedervorlage erledigt.
        sentiment: Manuelle Sentiment-Bewertung.
        created_at: Anlage-Zeitstempel (UTC).
        updated_at: Letzter Update-Zeitstempel (UTC).
        tags: Zugeordnete Tags via ``core_taggable``.
    """

    __tablename__ = "application_communication"
    __table_args__ = (
        Index(
            "ix_application_communication_submission_date",
            "application_submission_id",
            text("date DESC"),
        ),
        Index("ix_application_communication_follow_up", "follow_up_done", "follow_up_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_submission.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(20),
        default=CommunicationType.NOTE,
        server_default=CommunicationType.NOTE.value,
        nullable=False,
    )
    direction: Mapped[str] = mapped_column(
        String(20),
        default=CommunicationDirection.OUTBOUND,
        server_default=CommunicationDirection.OUTBOUND.value,
        nullable=False,
    )
    subject: Mapped[str | None] = mapped_column(String(500), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    next_steps: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    follow_up_done: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", default=False)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)

    submission: Mapped[Submission] = relationship("Submission", back_populates="communications")
    tags: Mapped[list[Tag]] = relationship(
        "Tag",
        secondary="shared_taggable",
        primaryjoin=lambda: and_(
            Communication.id == Taggable.taggable_id,
            Taggable.taggable_type == "application_communication",
        ),
        secondaryjoin=Taggable.tag_id == Tag.id,
        viewonly=True,
        lazy="selectin",
        order_by="Tag.name",
    )

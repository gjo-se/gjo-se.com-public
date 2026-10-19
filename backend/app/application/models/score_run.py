"""SQLAlchemy-Modell fuer ScoreRun (Bewerbungs-Score-Durchgang, gjo_se_com).

Ein Run gehoert zu genau einem ``application_submission`` und einem ``project``
(beide ON DELETE CASCADE) und ist **append-only** – er wird in einer Transaktion
angelegt und abgeschlossen (``completed_at``). Es gibt bewusst **kein**
``status``-Feld: ein unvollstaendiger Run (``completed_at IS NULL``) ist nie
sichtbar. ``llm_call_log_id`` liegt im **core**-Schema und traegt daher bewusst
**keinen** FK (Cross-DB).
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.application.models.score_criterion import (
        ScoreCriterion,
    )


class ScoreRun(Base):
    """Bewerbungs-Score-Durchgang (Gate 2) – append-only Score-Historie.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        application_submission_id: FK zum Vorgang (ON DELETE CASCADE).
        project_id: FK zum Projekt (ON DELETE CASCADE).
        weights_version: Version des verwendeten Gewichts-Satzes (Kanon).
        requirements: Extrahierte Anforderungen des Projekts (JSONB).
        total_score: Gesamtscore (NULL bis abgeschlossen).
        verdict: Score-Verdict (``ready``/``borderline``/``weak``).
        llm_call_log_id: Referenz auf den LLM-Call-Log (core-Schema, **kein** FK).
        created_at: Anlage-Zeitstempel (UTC).
        completed_at: Abschluss-Zeitstempel (NULL = noch nicht abgeschlossen).
        criteria: Einzel-Kriterien des Durchgangs (1:n).
    """

    __tablename__ = "application_score_run"
    __table_args__ = (
        Index(
            "ix_application_score_run_submission_history",
            "application_submission_id",
            text("created_at DESC"),
        ),
        Index("ix_application_score_run_project_id", "project_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_submission.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fbf_project.id", ondelete="CASCADE"),
        nullable=False,
    )
    weights_version: Mapped[str] = mapped_column(String(20), nullable=False)
    requirements: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True, default=list)
    total_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    verdict: Mapped[str | None] = mapped_column(String(20), nullable=True)
    llm_call_log_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    criteria: Mapped[list[ScoreCriterion]] = relationship(
        "ScoreCriterion",
        back_populates="run",
        cascade="all, delete-orphan",
    )

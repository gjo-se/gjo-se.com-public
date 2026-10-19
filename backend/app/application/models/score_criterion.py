"""SQLAlchemy-Modell fuer ScoreCriterion (Einzel-Kriterium, gjo_se_com).

Ein Kriterium gehoert zu genau einem ``application_score_run`` (ON DELETE CASCADE)
und haelt den bewerteten Wert samt Gewicht-Snapshot und Begruendung. Der
Gewicht wird als Snapshot gespeichert, damit die Historie unabhaengig von
spaeteren Kanon-Aenderungen reproduzierbar bleibt.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.application.models.score_run import ScoreRun


class ScoreCriterion(Base):
    """Einzel-Kriterium eines Bewerbungs-Score-Durchgangs.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        score_run_id: FK zum Score-Durchgang (ON DELETE CASCADE).
        criterion_key: Kriterium-Schluessel (z. B. ``must_skills``).
        group_key: Gruppe des Kriteriums (``inhalt``/``form``/``rahmen``).
        value: Bewertung 0–1; ``NULL`` = Datenluecke (Unsicherheit).
        weight: Gewicht-Snapshot zum Bewertungszeitpunkt.
        reason: Begruendung der Bewertung.
        evidence: Belege aus dem Projekt-/Bewerber-Kontext.
        action: Abgeleitete Handlungsempfehlung.
        created_at: Anlage-Zeitstempel (UTC).
        run: Zugehoeriger Score-Durchgang.
    """

    __tablename__ = "application_score_criterion"
    __table_args__ = (
        UniqueConstraint(
            "score_run_id",
            "criterion_key",
            name="uq_application_score_criterion_score_run_key",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    score_run_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_score_run.id", ondelete="CASCADE"),
        nullable=False,
    )
    criterion_key: Mapped[str] = mapped_column(String(50), nullable=False)
    group_key: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    action: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    run: Mapped[ScoreRun] = relationship("ScoreRun", back_populates="criteria")

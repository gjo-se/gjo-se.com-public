"""SQLAlchemy-Modell fuer ProjectEndcustomerCandidate (AIScope-Domain).

Fla che Kandidaten-Tabelle unter project – ein Kandidat pro Zeile,
FK zu project.id mit CASCADE. Kein Gruppierungs-Durchlauf.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class EndcustomerCandidateSource(StrEnum):
    """Quelle eines Endkunden-Kandidaten."""

    BRAVE = "brave"
    TAVILY = "tavily"
    BOTH = "both"


class ProjectEndcustomerCandidate(Base):
    """Ein einzelner Endkunden-Kandidat fuer ein Projekt.

    Jeder Kandidat wird als eigene Zeile gespeichert – neue Recherche-Laeufe
    fuegen weitere Zeilen hinzu (keine Gruppierung nach Durchlauf).

    Der Kandidaten-Status wird nicht mehr als Spalte am Modell gefuehrt,
    sondern via ``core_statusable`` (polymorphe Junction-Table) abgebildet.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        project_id: FK zu ``project.id`` (CASCADE).
        company_name: Name des Kandidaten-Unternehmens.
        website: Website des Unternehmens.
        career_page_url: URL der Karriereseite.
        confidence: Konfidenz-Score (0.0–1.0).
        source: Quelle des Kandidaten (brave, tavily, both).
        career_page_description: Karriereseiten-Beschreibung (nur bei accepted).
        similarity_to_project: Cosine-Similarity zwischen Projekt und Kandidat.
        reasoning: Begruendung der LLM-Entscheidung.
        created_at: Anlage-Zeitstempel (UTC).
    """

    __tablename__ = "fbf_project_endcustomer_candidate"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fbf_project.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_name: Mapped[str] = mapped_column(String(500), nullable=False)
    website: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    career_page_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0"))
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    career_page_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    similarity_to_project: Mapped[float | None] = mapped_column(Float, nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

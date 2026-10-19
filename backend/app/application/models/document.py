"""SQLAlchemy-Modell fuer Document (generiertes Bewerbungsdokument).

Ein Dokument gehoert zu genau einem ``application_submission`` (ON DELETE CASCADE)
und beschreibt den erzeugten Anhang (Anschreiben/Lebenslauf) inklusive
``storage_key`` als SSOT fuer das Object-Storage-Objekt.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.application.models.submission import Submission


class ApplicationDocumentKind(StrEnum):
    """Art des generierten Dokuments."""

    CV = "cv"


class Document(Base):
    """Generiertes Bewerbungsdokument (Anhang zu einem Vorgang).

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        application_submission_id: FK zum Vorgang (ON DELETE CASCADE).
        kind: Dokumentart (aktuell nur ``cv``).
        storage_key: Schluessel im Object Storage – unique (SSOT).
        filename: Dateiname fuer den Download.
        mime_type: MIME-Typ der Datei.
        size_bytes: Dateigroesse in Bytes.
        checksum_sha256: SHA-256-Pruefsumme der Datei.
        render_context: Eingabekontext der Rendering-Pipeline (JSONB).
        generated_at: Zeitpunkt der Erzeugung (UTC).
        created_at: Anlage-Zeitstempel (UTC).
    """

    __tablename__ = "application_document"
    __table_args__ = (Index("ix_application_document_submission", "application_submission_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_submission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_submission.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(
        String(20),
        default=ApplicationDocumentKind.CV,
        server_default=ApplicationDocumentKind.CV.value,
        nullable=False,
    )
    storage_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    render_context: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    submission: Mapped[Submission] = relationship("Submission", back_populates="documents")

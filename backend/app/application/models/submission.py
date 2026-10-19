"""SQLAlchemy-Modell fuer Submission (Bewerbungsvorgang, gjo_se_com).

Ein Vorgang verknuepft ein ``project`` mit dem Absenderprofil und buendelt die
generierten Dokumente sowie den Kommunikationsverlauf. Pro Projekt sind mehrere
Vorgaenge erlaubt (Historie, z. B. de/en); genau einer davon ist ``is_current``.
Der Bearbeitungsstatus laeuft ausschliesslich ueber ``core_statusable``
(``application_submission``) – bewusst ohne ``status``-Relationship.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.communication import (
        Communication,
    )
    from app.application.models.document import Document
    from app.application.models.profile import Profile


class Submission(TimestampMixin, Base):
    """Bewerbungsvorgang – mehrere Vorgaenge je Projekt, genau einer ``is_current``.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        project_id: FK zum Projekt (mehrere Vorgaenge je Projekt erlaubt; Historie).
        sender_profile_id: FK zum Absenderprofil (``application_profile``).
        subject: Betreff der Bewerbung.
        body: Anschreiben / Mail-Text (Plain-Text).
        language: Sprache der Bewerbungs-Mail (``de``/``en``).
        is_current: Genau eine aktuelle Bewerbung je Projekt (partieller Unique-Index).
        sender_email: Absender-Adresse (Snapshot).
        reply_to_email: Optionale Reply-To-Adresse.
        recipient_email: Empfaenger-Adresse.
        recipient_display_name: Anzeigename des Empfaengers.
        recipient_company_name: Firmenname des Empfaengers.
        created_at: Anlage-Zeitstempel (UTC).
        updated_at: Letzter Update-Zeitstempel (UTC).
    """

    __tablename__ = "application_submission"
    __table_args__ = (
        Index(
            "uq_application_submission_current",
            "project_id",
            unique=True,
            postgresql_where=text("is_current"),
            sqlite_where=text("is_current"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fbf_project.id", ondelete="CASCADE"),
        unique=False,
        nullable=False,
    )
    sender_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_profile.id", ondelete="CASCADE"),
        nullable=False,
    )
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(5), nullable=False, server_default="de")
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    sender_email: Mapped[str] = mapped_column(String(255), nullable=False)
    reply_to_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    recipient_display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recipient_company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    sender_profile: Mapped[Profile] = relationship("Profile")
    documents: Mapped[list[Document]] = relationship(
        "Document",
        back_populates="submission",
        cascade="all, delete-orphan",
    )
    communications: Mapped[list[Communication]] = relationship(
        "Communication",
        back_populates="submission",
        cascade="all, delete-orphan",
    )

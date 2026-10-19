"""SQLAlchemy-Modell fuer ProjectPerson (CRM-Domain, Junction n:m Projekt↔Person)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class ProjectPerson(Base):
    """Junction-Tabelle zur Verknuepfung von AIScope-Projekten mit CRM-Personen (n:m).

    ``ondelete="CASCADE"`` auf beiden FKs stellt sicher, dass beim Loeschen
    eines Projekts oder einer Person die zugehoerigen Junction-Zeilen mitgeloescht werden.
    Der Composite-Unique-Constraint stellt sicher, dass eine Person nicht mehrfach
    mit demselben Projekt verknuepft wird.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        project_id: FK zu ``fbf_project.id`` (Integer).
        crm_person_id: FK zu ``crm_person.id`` (Integer).
        label: Beziehungs-Label (z.B. ``primary``, ``secondary``).
        created_at: Anlage-Zeitstempel (UTC).
    """

    __tablename__ = "crm_project_person"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "crm_person_id",
            name="uq_project_crm_person_project_crm_person",
        ),
        Index("ix_project_crm_person_project_id", "project_id"),
        Index("ix_project_crm_person_crm_person_id", "crm_person_id"),
        Index(
            "uq_project_crm_person_primary",
            "project_id",
            unique=True,
            postgresql_where=text("label = 'primary'"),
            sqlite_where=text("label = 'primary'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("fbf_project.id", ondelete="CASCADE"), nullable=False)
    crm_person_id: Mapped[int] = mapped_column(Integer, ForeignKey("crm_person.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False, server_default="primary")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

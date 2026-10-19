"""SQLAlchemy-Modell fuer Person (CRM-Domain, SSOT fuer Personendaten)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, and_
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin
from app.shared.tagging.models.tag import Tag, Taggable

if TYPE_CHECKING:
    from app.crm.models.address import Address


class Person(TimestampMixin, Base):
    """Single Source of Truth (SSOT) fuer Personendaten.

    ``email`` ist unique, um doppelte Anlage auf DB-Ebene zu verhindern. Sie ist
    nullable: Ist keine echte E-Mail bekannt (z. B. Hunter-Fehltreffer), bleibt
    das Feld ``NULL`` statt mit einem Platzhalter gefuellt zu werden. Mehrere
    ``NULL``-Zeilen sind unter ``UNIQUE`` erlaubt – Dedup greift damit nur fuer
    echte Adressen.
    Die Company-Zugehoerigkeit wird via ``address_id`` → ``crm_address.crm_company_id``
    abgeleitet (kanonischer Pfad, SSOT).

    Status (active/rejected/favorite) wird via core_statusable (crm_person) verwaltet.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        first_name: Vorname.
        last_name: Nachname.
        email: E-Mail-Adresse – unique, nullable (NULL = unbekannt).
        phone: Telefonnummer.
        role: Rolle / Position.
        department: Abteilung.
        linkedin_url: LinkedIn-Profil.
        xing_url: XING-Profil.
        address_id: Optionaler FK auf crm_address (Standort-Zuordnung, SSOT fuer Company).
        address: Zugehoerige Address (via FK).
        confidence_score: Hunter.io Verifikations-Score (0-100).
        enrichment_source: Quelle des Enrichments (z.B. "hunter").
        contact_blocked_reason: Begruendung der Kontaktsperre.
        created_at: Anlage-Zeitstempel (UTC).
        updated_at: Letzter Update-Zeitstempel (UTC).
    """

    __tablename__ = "crm_person"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    xing_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address_id: Mapped[int | None] = mapped_column(
        "crm_address_id", Integer, ForeignKey("crm_address.id", ondelete="SET NULL"), nullable=True
    )
    confidence_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    enrichment_source: Mapped[str | None] = mapped_column(String(50), nullable=True, server_default="hunter")
    contact_blocked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    address: Mapped[Address | None] = relationship("Address")
    tags: Mapped[list[Tag]] = relationship(
        "Tag",
        secondary="shared_taggable",
        primaryjoin=lambda: and_(
            Person.id == Taggable.taggable_id,
            Taggable.taggable_type == "crm_person",
        ),
        secondaryjoin=Taggable.tag_id == Tag.id,
        viewonly=True,
        lazy="selectin",
        order_by="Tag.name",
    )

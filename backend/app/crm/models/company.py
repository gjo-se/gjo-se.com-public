"""SQLAlchemy-Modell fuer Company (CRM-Domain, SSOT fuer Firmendaten)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Index, Integer, Numeric, String, Text, and_, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin
from app.shared.tagging.models.tag import Tag, Taggable

if TYPE_CHECKING:
    from app.crm.models.address import Address


class Company(TimestampMixin, Base):
    """Single Source of Truth (SSOT) fuer Firmendaten.

    Jede Firma hat einen case-insensitive unique Namen (auf DB-Ebene via
    funktionalem Index ``lower(name)`` erzwungen). Mehrere Adressen und
    Kontaktpersonen koennen verknuepft werden.

    Status (active/rejected/favorite) wird via core_statusable (crm_company) verwaltet.

    Attributes:
        id: Primaerschluessel (Integer, autoincrement).
        name: Firmenname – case-insensitive unique.
        company_type: Art der Firma (``endcustomer`` = Endkunde, ``broker`` =
            Vermittler). ``None`` = keine Angabe. Wird bei der Anlage aus dem
            Projekt (``project.endcustomer``) uebernommen.
        email: Generische Firmen-E-Mail (z. B. ``karriere@`` / ``info@``).
            Nullable und **nicht** unique: mehrere Firmen duerfen dieselbe
            Alias-Adresse tragen. Dient beim Versand als Fallback, wenn die
            Kontaktperson keine persoenliche Adresse hat.
        website: Firmen-Website URL.
        industry: Branchen-Klassifikation.
        company_size: Groessenkategorie (z.B. ``1-10``, ``11-50``).
        founded_year: Gruendungsjahr.
        linkedin_url: LinkedIn-Firmenseite.
        xing_url: XING-Firmenseite.
        kununu_url: Kununu-Firmenseite.
        kununu_score: Kununu-Bewertung (0.00–5.00).
        contact_blocked_reason: Begruendung der Kontaktsperre.
        created_at: Anlage-Zeitstempel (UTC).
        updated_at: Letzter Update-Zeitstempel (UTC).
        addresses: Verknuepfte Adressdatensaetze.
    """

    __tablename__ = "crm_company"
    __table_args__ = (Index("uq_crm_company_name_lower", text("lower(name)"), unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    company_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(64), nullable=True)
    founded_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    xing_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kununu_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kununu_score: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    contact_blocked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    addresses: Mapped[list[Address]] = relationship("Address", back_populates="company", cascade="all, delete-orphan")
    tags: Mapped[list[Tag]] = relationship(
        "Tag",
        secondary="shared_taggable",
        primaryjoin=lambda: and_(
            Company.id == Taggable.taggable_id,
            Taggable.taggable_type == "crm_company",
        ),
        secondaryjoin=Taggable.tag_id == Tag.id,
        viewonly=True,
        lazy="selectin",
        order_by="Tag.name",
    )

"""SQLAlchemy-Modell fuer Address (CRM-Domain, Adressen fuer Firmen)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.crm.models.company import Company


class Address(TimestampMixin, Base):
    """Postal address of a CRM company, with one row optionally flagged primary."""

    __tablename__ = "crm_address"
    __table_args__ = (Index("ix_crm_address_company_id", "crm_company_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    crm_company_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("crm_company.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    street: Mapped[str | None] = mapped_column(String, nullable=True)
    zip: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", default=False)

    company: Mapped[Company] = relationship("Company", back_populates="addresses")

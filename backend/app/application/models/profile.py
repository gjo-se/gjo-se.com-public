"""SQLAlchemy model for the singleton application profile (gjo_se_com)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.application.models.career_entry import CareerEntry
    from app.application.models.focus_area import FocusArea
    from app.application.models.profile_translation import (
        ProfileTranslation,
    )


class Profile(Base):
    """Singleton profile table – Greg's freelancer identity as SSOT."""

    __tablename__ = "application_profile"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    headline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote: Mapped[str | None] = mapped_column(String(255), nullable=True)
    languages: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    hourly_rate_currency: Mapped[str | None] = mapped_column(String(3), nullable=True, server_default="EUR")
    available_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    career_entries: Mapped[list[CareerEntry]] = relationship(
        "CareerEntry", back_populates="application_profile", cascade="all, delete-orphan"
    )
    focus_areas: Mapped[list[FocusArea]] = relationship(
        "FocusArea",
        back_populates="profile",
        cascade="all, delete-orphan",
        order_by="FocusArea.sort",
    )
    translations: Mapped[list[ProfileTranslation]] = relationship(
        "ProfileTranslation",
        back_populates="profile",
        cascade="all, delete-orphan",
    )

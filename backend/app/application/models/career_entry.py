"""SQLAlchemy model for career entries – Greg's professional timeline (gjo_se_com)."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.career_entry_translation import (
        CareerEntryTranslation,
    )
    from app.application.models.profile import Profile


class CareerEntry(TimestampMixin, Base):
    """One entry in the professional career timeline.

    Linked 1:N to ``application_profile`` (ON DELETE CASCADE) and 1:N to
    ``application_career_entry_translation`` (localized descriptions).
    Sorted by ``sort`` ascending (newest first).
    Status (active/inactive) via core_statusable (application_career_entry).
    """

    __tablename__ = "application_career_entry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_profile.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sort: Mapped[int] = mapped_column(Integer, nullable=False)

    application_profile: Mapped[Profile] = relationship("Profile", back_populates="career_entries")
    translations: Mapped[list[CareerEntryTranslation]] = relationship(
        "CareerEntryTranslation", back_populates="entry", cascade="all, delete-orphan"
    )

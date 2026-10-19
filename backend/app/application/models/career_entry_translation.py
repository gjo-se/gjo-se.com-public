"""SQLAlchemy model for localized career entry translations (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.career_entry import CareerEntry


class CareerEntryTranslation(TimestampMixin, Base):
    """Localized description for a career entry.

    Linked 1:N to ``application_career_entry`` (ON DELETE CASCADE). At most one
    row per ``(career_entry_id, locale)`` pair (``de`` as default locale,
    ``en`` for English).
    """

    __tablename__ = "application_career_entry_translation"
    __table_args__ = (
        UniqueConstraint(
            "career_entry_id",
            "locale",
            name="uq_application_career_entry_translation_entry_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    career_entry_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_career_entry.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    entry: Mapped[CareerEntry] = relationship("CareerEntry", back_populates="translations")

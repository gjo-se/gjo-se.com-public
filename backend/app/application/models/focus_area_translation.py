"""SQLAlchemy model for localized focus area translations (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.focus_area import FocusArea


class FocusAreaTranslation(TimestampMixin, Base):
    """Localized title/summary for a focus area.

    Linked 1:N to ``application_focus_area`` (ON DELETE CASCADE). At most one
    row per ``(focus_area_id, locale)`` pair (``de`` as default locale, ``en``
    for English).
    """

    __tablename__ = "application_focus_area_translation"
    __table_args__ = (
        UniqueConstraint(
            "focus_area_id",
            "locale",
            name="uq_application_focus_area_translation_area_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    focus_area_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_focus_area.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    area: Mapped[FocusArea] = relationship("FocusArea", back_populates="translations")

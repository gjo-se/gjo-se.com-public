"""SQLAlchemy model for localized application profile translations (gjo_se_com)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.application.models.profile import Profile


class ProfileTranslation(Base):
    """Localized story content for the application profile.

    Linked 1:N to ``application_profile`` (ON DELETE CASCADE). At most one row
    per ``(profile_id, locale)`` pair (``de`` as default locale, ``en`` for
    English). ``story`` is an optional Markdown text.
    """

    __tablename__ = "application_profile_translation"
    __table_args__ = (
        UniqueConstraint(
            "profile_id",
            "locale",
            name="uq_application_profile_translation_profile_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_profile.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    profile: Mapped[Profile] = relationship("Profile", back_populates="translations")

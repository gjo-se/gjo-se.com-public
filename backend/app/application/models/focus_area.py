"""SQLAlchemy model for application focus areas (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.focus_area_translation import (
        FocusAreaTranslation,
    )
    from app.application.models.profile import Profile


class FocusArea(TimestampMixin, Base):
    """One focus area (e.g. AI / Architecture / CleanCode) of the profile.

    Linked 1:N to ``application_profile`` (ON DELETE CASCADE) and 1:N to
    ``application_focus_area_translation`` (localized title/summary).
    Sorted by ``sort`` ascending. At most one row per
    ``(application_profile_id, slug)`` pair.
    """

    __tablename__ = "application_focus_area"
    __table_args__ = (
        UniqueConstraint(
            "application_profile_id",
            "slug",
            name="uq_application_focus_area_profile_slug",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_profile.id", ondelete="CASCADE"),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(String(50), nullable=False)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    profile: Mapped[Profile] = relationship("Profile", back_populates="focus_areas")
    translations: Mapped[list[FocusAreaTranslation]] = relationship(
        "FocusAreaTranslation", back_populates="area", cascade="all, delete-orphan"
    )

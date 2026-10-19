"""SQLAlchemy model for localized experience decision translations (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.experience_decision import (
        ExperienceDecision,
    )


class ExperienceDecisionTranslation(TimestampMixin, Base):
    """Localized title/body for an experience decision.

    Linked 1:N to ``application_experience_decision`` (ON DELETE CASCADE). At
    most one row per ``(decision_id, locale)`` pair. ``discarded`` holds the
    deliberately rejected alternative (nullable).
    """

    __tablename__ = "application_experience_decision_translation"
    __table_args__ = (
        UniqueConstraint(
            "decision_id",
            "locale",
            name="uq_application_experience_decision_translation_decision_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    decision_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_experience_decision.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    discarded: Mapped[str | None] = mapped_column(Text, nullable=True)

    decision: Mapped[ExperienceDecision] = relationship("ExperienceDecision", back_populates="translations")

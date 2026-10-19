"""SQLAlchemy model for localized application experience translations (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.experience import (
        Experience,
    )


class ExperienceTranslation(TimestampMixin, Base):
    """Localized text blocks for an experience project.

    Linked 1:N to ``application_experience`` (ON DELETE CASCADE). At most one
    row per ``(experience_id, locale)`` pair (``de`` as default locale, ``en``
    for English). Each block is a single, Jinja-ready field – no markdown blob.
    """

    __tablename__ = "application_experience_translation"
    __table_args__ = (
        UniqueConstraint(
            "experience_id",
            "locale",
            name="uq_application_experience_translation_experience_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experience_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_experience.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    problem: Mapped[str | None] = mapped_column(Text, nullable=True)
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution_what: Mapped[str | None] = mapped_column(Text, nullable=True)
    #: Short comma-separated tech list (kept to a sensible length).
    tech_stack: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)

    experience: Mapped[Experience] = relationship("Experience", back_populates="translations")

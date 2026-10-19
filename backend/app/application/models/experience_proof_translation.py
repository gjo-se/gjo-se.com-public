"""SQLAlchemy model for localized experience proof translations (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.experience_proof import (
        ExperienceProof,
    )


class ExperienceProofTranslation(TimestampMixin, Base):
    """Localized proof text for an experience proof.

    Linked 1:N to ``application_experience_proof`` (ON DELETE CASCADE). At most
    one row per ``(proof_id, locale)`` pair.
    """

    __tablename__ = "application_experience_proof_translation"
    __table_args__ = (
        UniqueConstraint(
            "proof_id",
            "locale",
            name="uq_application_experience_proof_translation_proof_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    proof_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_experience_proof.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)

    proof: Mapped[ExperienceProof] = relationship("ExperienceProof", back_populates="translations")

"""SQLAlchemy model for experience proofs – the ``Proof`` list (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.experience import (
        Experience,
    )
    from app.application.models.experience_proof_translation import (
        ExperienceProofTranslation,
    )


class ExperienceProof(TimestampMixin, Base):
    """One proof bullet of the ``Proof`` list (structure).

    Linked 1:N to ``application_experience`` (ON DELETE CASCADE) and 1:N to
    ``application_experience_proof_translation`` (localized text). Sorted by
    ``sort`` ascending.
    """

    __tablename__ = "application_experience_proof"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experience_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_experience.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    experience: Mapped[Experience] = relationship("Experience", back_populates="proofs")
    translations: Mapped[list[ExperienceProofTranslation]] = relationship(
        "ExperienceProofTranslation",
        back_populates="proof",
        cascade="all, delete-orphan",
    )

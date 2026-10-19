"""SQLAlchemy model for localized portfolio proof translations (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.portfolio.models.proof import Proof


class ProofTranslation(Base):
    """Localized statement for a portfolio proof image.

    Linked 1:N to ``portfolio_proof`` (ON DELETE CASCADE). At most one
    row per ``(proof_id, locale)`` pair.
    """

    __tablename__ = "portfolio_proof_translation"
    __table_args__ = (
        UniqueConstraint("proof_id", "locale", name="uq_content_portfolio_proof_translation_proof_locale"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    proof_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("portfolio_proof.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    statement: Mapped[str] = mapped_column(String(500), nullable=False)
    question: Mapped[str | None] = mapped_column(String(500), nullable=True)

    proof: Mapped[Proof] = relationship("Proof", back_populates="translations")

"""SQLAlchemy model for portfolio image proofs (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.portfolio.models.portfolio import Portfolio
    from app.portfolio.models.proof_translation import ProofTranslation


class Proof(Base):
    """One image proof for a portfolio project.

    Linked 1:N to ``portfolio`` (ON DELETE CASCADE) and 1:N to
    ``portfolio_proof_translation`` (localized statements).
    """

    __tablename__ = "portfolio_proof"
    __table_args__ = (
        CheckConstraint(
            "priority IN ('high', 'medium')",
            name="ck_content_portfolio_proof_priority",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("portfolio.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_src: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
    )

    translations: Mapped[list[ProofTranslation]] = relationship(
        "ProofTranslation",
        back_populates="proof",
        cascade="all, delete-orphan",
        order_by="ProofTranslation.id",
    )
    portfolio: Mapped[Portfolio] = relationship("Portfolio", back_populates="proofs")

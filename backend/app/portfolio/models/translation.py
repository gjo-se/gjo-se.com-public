"""SQLAlchemy model for localized portfolio translations (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.portfolio.models.portfolio import Portfolio


class Translation(Base):
    """Localized content for a portfolio project.

    Linked 1:N to ``portfolio`` (ON DELETE CASCADE). At most one row per
    ``(portfolio_id, locale)`` pair (``de`` as default locale, ``en`` for English).
    """

    __tablename__ = "portfolio_translation"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "locale", name="uq_content_portfolio_translation_portfolio_locale"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("portfolio.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    sub_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    teaser: Mapped[str | None] = mapped_column(String(200), nullable=True)
    impact_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)

    portfolio: Mapped[Portfolio] = relationship("Portfolio", back_populates="translations")

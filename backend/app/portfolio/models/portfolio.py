"""SQLAlchemy model for portfolio projects (gjo_se_com)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.portfolio.models.proof import Proof
    from app.portfolio.models.translation import Translation


class Portfolio(TimestampMixin, Base):
    """One portfolio project.

    Linked 1:N to ``portfolio_translation`` (localized content) and
    ``portfolio_proof`` (image proofs). ``slug`` is globally unique and
    used by the public API for lookups.
    """

    __tablename__ = "portfolio"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    #: Eigentliches Hero/Teaser-Bild des Projekts (Storage-Key), unabhängig von den Proof-Bildern.
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    translations: Mapped[list[Translation]] = relationship(
        "Translation", back_populates="portfolio", cascade="all, delete-orphan"
    )
    proofs: Mapped[list[Proof]] = relationship(
        "Proof",
        back_populates="portfolio",
        cascade="all, delete-orphan",
        order_by="Proof.sort",
    )

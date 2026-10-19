"""SQLAlchemy model for LLM model price snapshots."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.shared.llm_gateway.models.model import LLMModel


class LLMModelPriceSnapshot(Base):
    """Immutable price snapshot for an LLM model – never overwritten, always appended.

    Attributes:
        id: Primary key.
        model_id: FK to :class:`LLMModel`.
        price_input: Price per 1 M input tokens (USD).
        price_output: Price per 1 M output tokens (USD).
        source: Data source identifier (default ``'openrouter'``).
        synced_at: Timestamp when this snapshot was recorded.
    """

    __tablename__ = "shared_price_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_model.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    price_input: Mapped[Decimal] = mapped_column(Numeric(12, 8), nullable=False)
    price_output: Mapped[Decimal] = mapped_column(Numeric(12, 8), nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False, default="openrouter")
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    model: Mapped[LLMModel] = relationship("LLMModel", back_populates="price_snapshots", lazy="noload")

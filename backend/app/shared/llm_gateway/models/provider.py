"""SQLAlchemy model for LLM providers."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.shared.llm_gateway.models.api_key import UserApiKey
    from app.shared.llm_gateway.models.model import LLMModel


class LLMProvider(Base):
    """Registry of known LLM providers (populated via OpenRouter sync).

    Attributes:
        id: Primary key.
        name: Unique provider identifier, e.g. ``'openai'``.
        display_name: Human-readable name, e.g. ``'OpenAI'``.
        created_at: Row creation timestamp.
    """

    __tablename__ = "shared_provider"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    api_base: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        comment="Base URL for direct API calls (e.g. https://api.deepseek.com/v1)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    models: Mapped[list[LLMModel]] = relationship("LLMModel", back_populates="provider", lazy="noload")
    api_keys: Mapped[list[UserApiKey]] = relationship("UserApiKey", back_populates="provider_rel", lazy="noload")

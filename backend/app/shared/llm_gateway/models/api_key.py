"""SQLAlchemy model for user-scoped LLM provider API keys."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.shared.llm_gateway.models.provider import LLMProvider


class UserApiKey(Base):
    """Stores an encrypted LLM provider API key for a specific user.

    Attributes:
        id: Primary key.
        user_id: FK to identity_user.id – each key is owned by exactly one user.
        provider_id: FK to shared_provider.id – identifies the provider.
        label: Optional human-readable label, e.g. "personal key April 26".
        key_value: Fernet-encrypted value stored as ``enc:<cipher>``; plaintext
            fallback when ``LLM_CREDENTIALS_KEY`` is not configured.
        valid_at: Timestamp of last successful provider validation (None = never
            validated).
        validation_error: Error message from the last failed validation attempt.
        created_at: Row creation timestamp (set by DB).
    """

    __tablename__ = "shared_api_key"
    __table_args__ = (UniqueConstraint("user_id", "provider_id", name="uq_shared_api_key_user_provider_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("identity_user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_provider.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    key_value: Mapped[str] = mapped_column(String, nullable=False)
    valid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validation_error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    provider_rel: Mapped[LLMProvider] = relationship("LLMProvider", back_populates="api_keys", lazy="noload")

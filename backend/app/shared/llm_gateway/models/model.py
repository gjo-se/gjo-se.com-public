"""SQLAlchemy model for LLM models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.shared.llm_gateway.models.price_snapshot import LLMModelPriceSnapshot
    from app.shared.llm_gateway.models.provider import LLMProvider


class LLMModel(Base):
    """An LLM model available via OpenRouter.

    Attributes:
        id: Primary key.
        openrouter_id: Composite OpenRouter model ID, e.g. ``'openai/gpt-4o-mini'``.
        native_model_id: Provider-native model ID, e.g. ``'gpt-4o-mini'``.
        provider_id: FK to :class:`LLMProvider`.
        display_name: Human-readable model name.
        description: Optional model description.
        context_window: Maximum context length in tokens.
        active: Whether the model is available for selection (Greg-controlled).
        first_seen_at: Timestamp when the model was first synced.
        last_seen_at: Timestamp of the most recent sync that included this model.
        supported_parameters: OpenRouter supported parameters (JSON).
        architecture: OpenRouter model architecture info (JSON).
        reasoning: OpenRouter reasoning capability info (JSON).
        default_parameters: OpenRouter default parameters (JSON).
        top_provider: OpenRouter top provider info (JSON).
        max_completion_tokens: Maximum completion tokens.
        knowledge_cutoff: Knowledge cutoff date string, e.g. ``'2024-06'``.
        hugging_face_id: HuggingFace model ID, e.g. ``'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'``.
        created: Unix timestamp of model creation on OpenRouter.
        canonical_slug: URL-friendly model slug from OpenRouter.
        is_locally_installed: Whether the model is installed locally via Ollama.
        task_type: Model capability classification (coding, reasoning, vision, general).
        task_tags: JSON array of task tags, e.g. ``'["sql","python"]'``.
    """

    __tablename__ = "shared_model"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    openrouter_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    native_model_id: Mapped[str] = mapped_column(String, nullable=False)
    provider_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_provider.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_window: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # ── OpenRouter fields ────────────────────────────────────────────────────
    supported_parameters: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    architecture: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    reasoning: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    default_parameters: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    top_provider: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    max_completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    knowledge_cutoff: Mapped[str | None] = mapped_column(String, nullable=True)
    hugging_face_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    created: Mapped[int | None] = mapped_column(Integer, nullable=True)
    canonical_slug: Mapped[str | None] = mapped_column(String, nullable=True)

    # ── Local installation ───────────────────────────────────────────────────
    is_locally_installed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Benchmark fields ─────────────────────────────────────────────────────
    task_type: Mapped[str] = mapped_column(String, nullable=False, default="general")
    task_tags: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    provider: Mapped[LLMProvider] = relationship("LLMProvider", back_populates="models", lazy="noload")
    price_snapshots: Mapped[list[LLMModelPriceSnapshot]] = relationship(
        "LLMModelPriceSnapshot", back_populates="model", lazy="noload"
    )

"""SQLAlchemy model and error-type enum for the central LLM call log."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class CallErrorType(StrEnum):
    """Standardised classification of an LLM call failure (SSOT).

    Groups otherwise heterogeneous exceptions into a small, stable set of
    error categories so the same problem is always counted and displayed
    the same way.
    """

    NO_MAPPING = "no_mapping"
    MODEL_DISABLED = "model_disabled"
    NO_CREDENTIAL = "no_credential"
    CREDENTIAL_INVALID = "credential_invalid"
    NO_PROMPT = "no_prompt"
    PROMPT_VARIABLE_MISSING = "prompt_variable_missing"
    PROVIDER_ERROR = "provider_error"
    RATE_LIMIT = "rate_limit"
    VALIDATION_ERROR = "validation_error"
    CIRCUIT_OPEN = "circuit_open"
    LANGFUSE_UNREACHABLE = "langfuse_unreachable"
    UNKNOWN = "unknown"


class CallType(StrEnum):
    """The kind of LLM invocation that produced a log row."""

    STRUCTURED = "structured"
    TEXT = "text"
    STREAM = "stream"


class CallRetryStatus(StrEnum):
    """Lifecycle states for a retry call-log row.

    Used in the ``retry_status`` column of :class:`CallLog`. Only retry
    rows (``retry_count >= 1``) carry a status; original calls have ``None``.
    """

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    DEAD = "dead"


class CallLog(Base):
    """One row per LLM call – success or failure – across all tasks.

    Central audit trail for every ``LLMClient`` invocation regardless of the
    trigger (button, backfill, pipeline). Written with its own DB session so a
    log write can never roll back or mask the actual call outcome.

    Attributes:
        id: Primary key.
        task: Task identifier, e.g. ``"description-merge"``.
        project_id: Optional originating project id (context).
        trigger: Optional trigger label, e.g. ``"button"``/``"backfill"``/``"pipeline"``.
        call_type: Invocation kind (``structured``/``text``/``stream``).
        success: Whether the call succeeded.
        error_type: Standardised error classification (only when ``success`` is False).
        error_message: Human-readable error detail (only on failure).
        resolved_model: Resolved model identifier (when known).
        resolved_credential: Resolved credential service label (when known).
        duration_ms: Wall-clock duration of the call in milliseconds.
        created_at: Row creation timestamp (indexed, for stats/purge).
    """

    __tablename__ = "shared_call_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    phase: Mapped[str | None] = mapped_column(String(50), nullable=True)
    project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trigger: Mapped[str | None] = mapped_column(String(50), nullable=True)
    call_type: Mapped[str] = mapped_column(String(20), nullable=False)
    success: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    error_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_model: Mapped[str | None] = mapped_column(String, nullable=True)
    resolved_credential: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    input_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    retry_of_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("shared_call_log.id", ondelete="SET NULL"),
        nullable=True,
    )
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    retry_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    output_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    promoted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    promoted_to: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dataset_item_id: Mapped[str | None] = mapped_column(String, nullable=True)

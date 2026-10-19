"""SQLAlchemy model and state enum for the LLM circuit breaker."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin


class CircuitState(StrEnum):
    """Circuit breaker states following the standard three-state pattern.

    CLOSED:   Normal operation – calls pass through.
    OPEN:     Circuit is tripped – calls are blocked.
    HALF_OPEN: Probe state – a single call is allowed to test recovery.
    """

    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreaker(TimestampMixin, Base):
    """Circuit breaker state for a single provider key.

    One row per ``provider_key`` (e.g. ``"openrouter"`` or
    ``"direct:deepseek"``). Protects providers from cascading failures
    by blocking calls after a configurable number of consecutive errors.

    Attributes:
        id: Primary key.
        provider_key: Unique provider identifier string.
        state: Current circuit state (CLOSED / OPEN / HALF_OPEN).
        failure_count: Number of consecutive failures since last reset.
        opened_at: Timestamp when the circuit transitioned to OPEN.
        last_probe_at: Timestamp of the last HALF_OPEN probe.
        threshold: Number of consecutive failures before opening.
        cooldown_seconds: Seconds to wait before a HALF_OPEN probe.
        created_at: Row creation timestamp.
        updated_at: Row last-update timestamp.
    """

    __tablename__ = "shared_circuit_breaker"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider_key: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    state: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=CircuitState.CLOSED.value,
        server_default=CircuitState.CLOSED.value,
    )
    failure_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_probe_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    threshold: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        server_default="5",
    )
    cooldown_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=60,
        server_default="60",
    )

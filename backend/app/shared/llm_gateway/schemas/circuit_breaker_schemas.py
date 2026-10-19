"""Pydantic schemas for the LLM circuit breaker API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CircuitBreakerOut(BaseModel):
    """Public representation of a circuit breaker row."""

    provider_key: str = Field(..., description="Unique provider identifier")
    state: str = Field(..., description="Current circuit state (CLOSED/OPEN/HALF_OPEN)")
    failure_count: int = Field(..., description="Consecutive failure count")
    opened_at: datetime | None = Field(default=None, description="Timestamp when circuit opened")
    last_probe_at: datetime | None = Field(default=None, description="Timestamp of last HALF_OPEN probe")
    threshold: int = Field(..., description="Failure threshold before opening")
    cooldown_seconds: int = Field(..., description="Cooldown seconds before probe")

    model_config = ConfigDict(from_attributes=True)


class CircuitBreakerResetOut(BaseModel):
    """Response after a manual circuit breaker reset."""

    provider_key: str = Field(..., description="Provider that was reset")
    state: str = Field(..., description="New state (always CLOSED)")
    failure_count: int = Field(..., description="Failure count (always 0)")

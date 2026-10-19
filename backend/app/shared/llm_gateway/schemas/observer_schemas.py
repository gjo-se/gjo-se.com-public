"""Pydantic schemas for observer tickets and the observer metrics dashboard.

SSOT for the API layer – every observer request/response flows through
these models with full validation and German error messages.

Merged from the former ``observer_metrics.py`` and ``observer_ticket.py``
to follow the ``<aggregat>_schemas.py`` naming canon.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ── Observer metrics ─────────────────────────────────────────────────────────


class TaskMetricOut(BaseModel):
    """Per-task aggregated metric for the dashboard health cards."""

    name: str = Field(..., description="Task-Key (z.B. description-merge)")
    p50_ms: int | None = Field(None, description="Median latency in ms")
    p95_ms: int | None = Field(None, description="95th percentile latency in ms")
    p99_ms: int | None = Field(None, description="99th percentile latency in ms")
    error_rate: float = Field(0.0, ge=0.0, le=1.0, description="Error rate (0.0–1.0)")
    ticket_count: int = Field(0, description="Open observer tickets for this task")


class TimelinePointOut(BaseModel):
    """Single data point for the latency chart time series."""

    ts: datetime = Field(..., description="ISO-8601 timestamp of the bucket")
    task: str = Field(..., description="Task-Key")
    p50_ms: int | None = Field(None)
    p95_ms: int | None = Field(None)
    p99_ms: int | None = Field(None)


class ObserverMetricsResponse(BaseModel):
    """Aggregated dashboard metrics returned by GET /admin/observer/metrics."""

    tasks: list[TaskMetricOut] = Field(default_factory=list)
    timeline: list[TimelinePointOut] = Field(default_factory=list)


# ── Observer tickets ─────────────────────────────────────────────────────────


class ObserverTicketCreate(BaseModel):
    """Payload for creating a new observer ticket (called by the observer cron job)."""

    ticket_type: str = Field(..., description="Ticket-Typ (latency_anomaly, error_spike, cost_overrun)")
    severity: str = Field(..., description="Schweregrad (critical, warning, info)")
    task: str = Field(..., description="Name des LLM-Tasks (z.B. description-merge)")
    anomaly_details: dict[str, Any] | None = Field(
        None, description="Anomalie-Details als JSON mit baseline, current, threshold, affected_trace_ids"
    )
    diagnosis: str = Field(..., description="Menschenlesbare Diagnose des Problems")
    langfuse_trace_url: str | None = Field(None, description="Deep-Link zum LangFuse Trace")


class ObserverTicketUpdate(BaseModel):
    """Payload for updating an existing ticket's status."""

    status: str = Field(..., description="Neuer Status (acknowledged, in_progress, resolved, dismissed)")


class ObserverTicketResponse(BaseModel):
    """Public-facing response model for the observer ticket API."""

    id: int
    ticket_type: str
    severity: str
    task: str
    anomaly_details: dict[str, Any] | None
    diagnosis: str | None
    langfuse_trace_url: str | None
    status: str
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


# ── Resolve with failure candidates ──────────────────────────────────────────


class SuggestedFailureCandidateOut(BaseModel):
    """A call log linked to an observer ticket, suggested for failure dataset."""

    call_log_id: int
    task: str
    error_type: str | None
    success: bool | None
    duration_ms: int | None
    created_at: str  # ISO 8601


class ObserverTicketResolveResponse(ObserverTicketResponse):
    """Response after resolving a ticket, including linked failure candidates."""

    suggested_failure_candidates: list[SuggestedFailureCandidateOut] = Field(
        default_factory=list,
        description="Linked call logs to promote as failure cases",
    )

"""Shared enum types for the LLM observer ticket system.

These enums are the SSOT for ticket type, severity, and status used by
:class:`ObserverTicket` and its associated services and schemas.
"""

from __future__ import annotations

from enum import StrEnum


class TicketType(StrEnum):
    """Classification of an observer-generated ticket."""

    LATENCY_ANOMALY = "latency_anomaly"
    """p95 latency exceeds the baseline threshold."""

    ERROR_SPIKE = "error_spike"
    """Error rate exceeds the configured threshold."""

    COST_OVERRUN = "cost_overrun"
    """Cost per call or total cost exceeds the threshold."""


class TicketSeverity(StrEnum):
    """Severity level of an observer ticket."""

    CRITICAL = "critical"
    """p95 > 2.0 × baseline – requires immediate attention."""

    WARNING = "warning"
    """p95 > 1.5 × baseline or error_rate > 5 % – needs investigation."""

    INFO = "info"
    """New error type or other noteworthy event – no action required yet."""


class TicketStatus(StrEnum):
    """Lifecycle states of an observer ticket."""

    OPEN = "open"
    """Ticket has been created but not yet acknowledged."""

    ACKNOWLEDGED = "acknowledged"
    """Ticket has been seen and is awaiting action."""

    IN_PROGRESS = "in_progress"
    """Ticket is actively being worked on."""

    RESOLVED = "resolved"
    """The issue has been addressed."""

    DISMISSED = "dismissed"
    """Ticket was reviewed and determined to be a false positive or not actionable."""

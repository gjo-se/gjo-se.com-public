"""Unit tests for the observer-ticket enum SSOT."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.models.enums import TicketSeverity, TicketStatus, TicketType


@pytest.mark.unit
def test_ticket_type_exposes_the_three_ssot_values() -> None:
    """Ticket type couples classification names to their persisted string values."""
    assert {t.value for t in TicketType} == {"latency_anomaly", "error_spike", "cost_overrun"}


@pytest.mark.unit
def test_ticket_severity_orders_critical_warning_info() -> None:
    """Severity exposes the three escalation levels used by the observer."""
    assert [s.value for s in TicketSeverity] == ["critical", "warning", "info"]


@pytest.mark.unit
def test_ticket_status_enumerates_the_full_lifecycle() -> None:
    """Status covers the complete ticket lifecycle from open to dismissed."""
    assert {s.value for s in TicketStatus} == {
        "open",
        "acknowledged",
        "in_progress",
        "resolved",
        "dismissed",
    }

"""Unit tests for the observer-ticket model."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.models.observer_ticket import ObserverTicket


@pytest.mark.unit
def test_observer_ticket_table_contract_requires_type_severity_task() -> None:
    """A ticket always carries type, severity, task and status."""
    table = ObserverTicket.__table__
    assert table.name == "shared_observer_ticket"
    assert table.c.ticket_type.nullable is False
    assert table.c.severity.nullable is False
    assert table.c.task.nullable is False
    assert table.c.status.nullable is False


@pytest.mark.unit
def test_observer_ticket_links_are_backed_by_junction_relationship() -> None:
    """The call-log links relationship is the back-reference of the junction side."""
    relationship = ObserverTicket.__mapper__.relationships["call_log_links"]
    assert relationship.back_populates == "observer_ticket"

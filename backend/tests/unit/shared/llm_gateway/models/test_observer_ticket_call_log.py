"""Unit tests for the observer-ticket ↔ call-log junction model."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.models.observer_ticket_call_log import ObserverTicketCallLog


@pytest.mark.unit
def test_junction_row_is_identified_by_the_pair_of_foreign_keys() -> None:
    """The junction uses a composite primary key of ticket and call-log id."""
    primary_key = {c.name for c in ObserverTicketCallLog.__table__.primary_key}
    assert primary_key == {"observer_ticket_id", "llm_call_log_id"}


@pytest.mark.unit
def test_junction_foreign_keys_cascade_on_delete() -> None:
    """Both foreign keys cascade so a deleted side cleans up its links."""
    table = ObserverTicketCallLog.__table__
    assert table.name == "shared_observer_ticket_call_log"
    ticket_fk = next(iter(table.c.observer_ticket_id.foreign_keys))
    call_fk = next(iter(table.c.llm_call_log_id.foreign_keys))
    assert ticket_fk.ondelete == "CASCADE"
    assert call_fk.ondelete == "CASCADE"

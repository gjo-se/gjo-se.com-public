"""Integration tests for the LLM observer anomaly detection."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.models.enums import TicketType
from app.shared.llm_gateway.services import observer_service as observer_module
from app.shared.llm_gateway.services.observer_service import Observer
from app.shared.llm_gateway.services.observer_ticket_service import ObserverTicketService
from tests.quarantine import quarantine


def _observer(db_session: AsyncSession) -> Observer:
    """Build an observer wired to a real ticket service."""
    return Observer(db_session, ObserverTicketService(db_session))


@pytest.mark.integration
async def test_run_returns_no_tickets_without_recent_logs(db_session: AsyncSession) -> None:
    """An empty call log produces no anomaly tickets."""
    assert await _observer(db_session).run() == []


@pytest.mark.integration
@quarantine(
    owner="Greg",
    deadline="2026-10-24",
    reason=(
        "Flaky unter `-n auto --dist loadgroup`: intermittierende Ticket-Isolation "
        "(ein Lauf meldet 0 statt 1 Overrun-Ticket, der Folgetest einen Duplikat-Rest). "
        "Isoliert grün. RCA offen – Observer-/CallLog-Isolation härten oder Dedupe-Fenster prüfen."
    ),
)
async def test_run_creates_a_cost_overrun_ticket_when_the_hourly_limit_is_exceeded(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exceeding the hourly call limit raises a COST_OVERRUN ticket."""
    monkeypatch.setattr(observer_module.settings, "LLM_ALERT_MAX_CALLS_PER_HOUR", 0)
    monkeypatch.setattr(observer_module.settings, "LLM_ALERT_MAX_COST_PER_HOUR", 1000.0)
    monkeypatch.setattr(observer_module.settings, "LLM_ALERT_PUSH_ENABLED", False)
    db_session.add(CallLog(task="description-merge", call_type="text", success=True, duration_ms=10))
    await db_session.commit()

    tickets = await _observer(db_session).run()

    assert len(tickets) == 1
    assert tickets[0].ticket_type == TicketType.COST_OVERRUN


@pytest.mark.integration
@quarantine(
    owner="Greg",
    deadline="2026-10-24",
    reason=(
        "Flaky unter `-n auto --dist loadgroup`: intermittierende Ticket-Isolation "
        "(der zweite Lauf liefert einen offenen Ticket-Rest statt []). Isoliert grün. "
        "RCA offen – Observer-/CallLog-Isolation härten oder Dedupe-Fenster prüfen."
    ),
)
async def test_run_does_not_duplicate_an_open_cost_ticket(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A second run with an open ticket of the same type creates no duplicate."""
    monkeypatch.setattr(observer_module.settings, "LLM_ALERT_MAX_CALLS_PER_HOUR", 0)
    monkeypatch.setattr(observer_module.settings, "LLM_ALERT_MAX_COST_PER_HOUR", 1000.0)
    monkeypatch.setattr(observer_module.settings, "LLM_ALERT_PUSH_ENABLED", False)
    db_session.add(CallLog(task="description-merge", call_type="text", success=True, duration_ms=10))
    await db_session.commit()
    observer = _observer(db_session)
    await observer.run()

    second_run = await observer.run()

    assert second_run == []

"""Integration tests for the observer-ticket CRUD service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.models.enums import TicketStatus
from app.shared.llm_gateway.schemas.observer_schemas import ObserverTicketCreate
from app.shared.llm_gateway.services.observer_ticket_service import ObserverTicketService


def _payload(task: str = "description-merge") -> ObserverTicketCreate:
    """Return a minimal valid observer-ticket payload."""
    return ObserverTicketCreate(
        ticket_type="latency_anomaly",
        severity="warning",
        task=task,
        diagnosis="p95 exceeds threshold",
    )


@pytest.mark.integration
async def test_create_persists_an_open_ticket(db_session: AsyncSession) -> None:
    """A new ticket is persisted in the OPEN state."""
    service = ObserverTicketService(db_session)

    ticket = await service.create(_payload())

    assert ticket.id is not None
    assert ticket.status == TicketStatus.OPEN


@pytest.mark.integration
async def test_acknowledge_transitions_to_acknowledged(db_session: AsyncSession) -> None:
    """Acknowledging a ticket moves it to the acknowledged state."""
    service = ObserverTicketService(db_session)
    ticket = await service.create(_payload())

    acked = await service.acknowledge(ticket.id)

    assert acked.status == TicketStatus.ACKNOWLEDGED


@pytest.mark.integration
async def test_get_open_filters_by_task(db_session: AsyncSession) -> None:
    """Open tickets can be filtered by their task key."""
    service = ObserverTicketService(db_session)
    await service.create(_payload(task="description-merge"))
    await service.create(_payload(task="other-task"))

    open_tickets = await service.get_open(task="description-merge")

    assert len(open_tickets) == 1
    assert open_tickets[0].task == "description-merge"


@pytest.mark.integration
async def test_find_open_by_task_and_type_detects_duplicate(db_session: AsyncSession) -> None:
    """An existing open ticket of the same task and type is found (dedup)."""
    service = ObserverTicketService(db_session)
    ticket = await service.create(_payload())

    found = await service.find_open_by_task_and_type("description-merge", "latency_anomaly")

    assert found is not None
    assert found.id == ticket.id


@pytest.mark.integration
async def test_resolve_collects_linked_failure_candidates(db_session: AsyncSession) -> None:
    """Resolving a ticket reports its linked call-log failures as candidates."""
    service = ObserverTicketService(db_session)
    ticket = await service.create(_payload())
    call_log = CallLog(task="description-merge", call_type="text", success=False, error_type="rate_limit")
    db_session.add(call_log)
    await db_session.commit()
    await service.link_call_log(ticket.id, call_log.id)

    response = await service.resolve(ticket.id)

    assert response.status == "resolved"
    assert [c.call_log_id for c in response.suggested_failure_candidates] == [call_log.id]

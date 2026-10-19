"""Integration tests for the circuit-breaker service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.circuit_breaker import CircuitState
from app.shared.llm_gateway.services.circuit_breaker_service import (
    CircuitBreakerOpenError,
    CircuitBreakerService,
)


@pytest.mark.integration
async def test_before_call_creates_a_closed_breaker(db_session: AsyncSession) -> None:
    """A first call for an unknown provider passes and creates a CLOSED row."""
    service = CircuitBreakerService()

    await service.before_call(db_session, "openrouter")

    rows = await service.get_all(db_session)
    assert len(rows) == 1
    assert rows[0].provider_key == "openrouter"
    assert rows[0].state == CircuitState.CLOSED.value


@pytest.mark.integration
async def test_repeated_failures_open_the_circuit(db_session: AsyncSession) -> None:
    """Reaching the failure threshold opens the circuit and blocks calls."""
    service = CircuitBreakerService()
    for _ in range(5):
        await service.on_failure(db_session, "openrouter")

    with pytest.raises(CircuitBreakerOpenError):
        await service.before_call(db_session, "openrouter")


@pytest.mark.integration
async def test_on_success_resets_failures_and_closes_the_circuit(db_session: AsyncSession) -> None:
    """A success after failures clears the counter and closes the circuit."""
    service = CircuitBreakerService()
    for _ in range(5):
        await service.on_failure(db_session, "openrouter")

    await service.on_success(db_session, "openrouter")

    row = (await service.get_all(db_session))[0]
    assert row.state == CircuitState.CLOSED.value
    assert row.failure_count == 0
    assert row.opened_at is None


@pytest.mark.integration
async def test_manual_reset_closes_an_open_circuit(db_session: AsyncSession) -> None:
    """A manual reset returns the breaker to CLOSED."""
    service = CircuitBreakerService()
    for _ in range(5):
        await service.on_failure(db_session, "openrouter")

    row = await service.reset(db_session, "openrouter")

    assert row.state == CircuitState.CLOSED.value

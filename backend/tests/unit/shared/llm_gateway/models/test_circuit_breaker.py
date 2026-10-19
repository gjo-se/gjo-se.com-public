"""Unit tests for the circuit-breaker model and its state enum."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.models.circuit_breaker import CircuitBreaker, CircuitState


@pytest.mark.unit
def test_circuit_state_exposes_three_state_pattern() -> None:
    """Circuit state implements the standard closed/open/half-open pattern."""
    assert {s.value for s in CircuitState} == {"CLOSED", "OPEN", "HALF_OPEN"}


@pytest.mark.unit
def test_circuit_breaker_defaults_to_closed_with_threshold_and_cooldown() -> None:
    """A new breaker row starts CLOSED with a failure threshold and cooldown."""
    table = CircuitBreaker.__table__
    assert table.c.provider_key.unique is True
    assert table.c.state.default.arg == CircuitState.CLOSED.value
    assert table.c.failure_count.default.arg == 0
    assert table.c.threshold.default.arg == 5
    assert table.c.cooldown_seconds.default.arg == 60

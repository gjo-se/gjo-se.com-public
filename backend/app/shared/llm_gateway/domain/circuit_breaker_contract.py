"""Service↔repository boundary records for the LLM circuit breaker.

The repository maps ``shared_circuit_breaker`` rows to
:class:`CircuitBreakerRecord` so ``app.shared.llm_gateway.services`` stays free
of ``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

#: Canonical circuit-breaker state values (mirror ``models.circuit_breaker.CircuitState``).
CIRCUIT_CLOSED = "CLOSED"
CIRCUIT_OPEN = "OPEN"
CIRCUIT_HALF_OPEN = "HALF_OPEN"


@dataclass(frozen=True, slots=True)
class CircuitBreakerRecord:
    """Immutable snapshot of one ``shared_circuit_breaker`` row.

    Attributes:
        id: Primary key.
        provider_key: Unique provider identifier.
        state: Current circuit state (``CLOSED``/``OPEN``/``HALF_OPEN``).
        failure_count: Consecutive failure count since the last reset.
        opened_at: Timestamp when the circuit transitioned to OPEN.
        last_probe_at: Timestamp of the last HALF_OPEN probe.
        threshold: Consecutive failures before opening.
        cooldown_seconds: Seconds to wait before a HALF_OPEN probe.
    """

    id: int
    provider_key: str
    state: str
    failure_count: int
    opened_at: datetime | None
    last_probe_at: datetime | None
    threshold: int
    cooldown_seconds: int

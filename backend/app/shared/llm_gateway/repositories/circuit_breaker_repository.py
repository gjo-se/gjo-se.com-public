"""Database access for the LLM circuit breaker (llm_gateway).

Read/write operations return :class:`CircuitBreakerRecord` domain objects (never
ORM models) so the service layer stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``). The ``AsyncSession`` is passed in by the caller (K3).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.circuit_breaker_contract import CircuitBreakerRecord
from app.shared.llm_gateway.models.circuit_breaker import CircuitBreaker


def _to_record(row: CircuitBreaker) -> CircuitBreakerRecord:
    """Maps a ``CircuitBreaker`` ORM row to its domain record."""
    return CircuitBreakerRecord(
        id=row.id,
        provider_key=row.provider_key,
        state=row.state,
        failure_count=row.failure_count,
        opened_at=row.opened_at,
        last_probe_at=row.last_probe_at,
        threshold=row.threshold,
        cooldown_seconds=row.cooldown_seconds,
    )


async def get_or_create(
    db: AsyncSession,
    provider_key: str,
    *,
    threshold: int,
    cooldown: int,
) -> CircuitBreakerRecord:
    """Returns the existing row for *provider_key*, creating a CLOSED one if absent."""
    result = await db.execute(select(CircuitBreaker).where(CircuitBreaker.provider_key == provider_key))
    row = result.scalar_one_or_none()
    if row is not None:
        return _to_record(row)

    row = CircuitBreaker(
        provider_key=provider_key,
        threshold=threshold,
        cooldown_seconds=cooldown,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_record(row)


async def save_state(
    db: AsyncSession,
    provider_key: str,
    *,
    state: str,
    failure_count: int,
    opened_at: datetime | None,
    last_probe_at: datetime | None,
) -> CircuitBreakerRecord:
    """Persists the given state fields on the row for *provider_key*."""
    result = await db.execute(select(CircuitBreaker).where(CircuitBreaker.provider_key == provider_key))
    row = result.scalar_one_or_none()
    if row is None:
        raise LookupError(f"Circuit breaker row for provider '{provider_key}' not found")
    row.state = state
    row.failure_count = failure_count
    row.opened_at = opened_at
    row.last_probe_at = last_probe_at
    await db.commit()
    await db.refresh(row)
    return _to_record(row)


async def list_all(db: AsyncSession) -> list[CircuitBreakerRecord]:
    """Returns all circuit breaker rows as records."""
    result = await db.execute(select(CircuitBreaker))
    return [_to_record(row) for row in result.scalars().all()]

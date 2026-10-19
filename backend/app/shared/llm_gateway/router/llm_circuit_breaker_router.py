"""Admin routes for the LLM provider circuit breakers."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_circuit_breaker_service
from app.shared.llm_gateway.schemas.circuit_breaker_schemas import (
    CircuitBreakerOut,
    CircuitBreakerResetOut,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/circuit-breaker",
    response_model=list[CircuitBreakerOut],
    summary="[Admin] List all circuit breaker states",
)
async def list_circuit_breakers(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> list[CircuitBreakerOut]:
    """Return the current state of every circuit breaker row.

    Args:
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        List of ``CircuitBreakerOut``, empty if no rows exist.
    """
    rows = await get_circuit_breaker_service().get_all(db)
    return [CircuitBreakerOut.model_validate(row) for row in rows]


@router.post(
    "/circuit-breaker/{provider_key}/reset",
    response_model=CircuitBreakerResetOut,
    summary="[Admin] Manually reset a circuit breaker to CLOSED",
)
@router.post(
    "/circuit-breaker/{provider_key}/reset",
    response_model=CircuitBreakerResetOut,
    summary="[Admin] Manually reset a circuit breaker to CLOSED",
)
async def reset_circuit_breaker(
    provider_key: str,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> CircuitBreakerResetOut:
    """Reset the circuit breaker for *provider_key* to CLOSED.

    Args:
        provider_key: Unique provider identifier (e.g. ``"openrouter"``).
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        ``CircuitBreakerResetOut`` with the new state.
    """
    row = await get_circuit_breaker_service().reset(db, provider_key)
    return CircuitBreakerResetOut(
        provider_key=row.provider_key,
        state=row.state,
        failure_count=row.failure_count,
    )

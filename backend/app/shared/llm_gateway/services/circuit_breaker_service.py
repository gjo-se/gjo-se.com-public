"""Circuit breaker service – protects LLM providers from cascading failures.

Single-worker circuit breaker backed by the ``llm_circuit_breaker`` database
table. Not distributed – sufficient for the current single-worker architecture.
The DB access lives in :mod:`...repositories.circuit_breaker_repository`.
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog

from app.shared.config.config import settings
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.circuit_breaker_contract import (
    CIRCUIT_CLOSED,
    CIRCUIT_HALF_OPEN,
    CIRCUIT_OPEN,
    CircuitBreakerRecord,
)
from app.shared.llm_gateway.repositories import circuit_breaker_repository as cb_repo

logger = structlog.get_logger(__name__)

_DEFAULT_THRESHOLD = 5
_DEFAULT_COOLDOWN = 60


class CircuitBreakerOpenError(RuntimeError):
    """Raised when a call is attempted while the circuit is OPEN."""


class CircuitBreakerService:
    """Manages circuit breaker state for LLM provider keys.

    Usage in ``task_executor_service``::

        await cb_service.before_call(db, provider_key)
        try:
            result = await client.call(...)
            await cb_service.on_success(db, provider_key)
        except Exception:
            await cb_service.on_failure(db, provider_key)
            raise
    """

    @staticmethod
    def _settings_threshold() -> int:
        """Returns the configured failure threshold (fallback to the default)."""
        return getattr(settings, "CIRCUIT_BREAKER_THRESHOLD", _DEFAULT_THRESHOLD)

    @staticmethod
    def _settings_cooldown() -> int:
        """Returns the configured cooldown seconds (fallback to the default)."""
        return getattr(settings, "CIRCUIT_BREAKER_COOLDOWN_SECONDS", _DEFAULT_COOLDOWN)

    async def _get_or_create(self, db: AsyncSession, provider_key: str) -> CircuitBreakerRecord:
        """Returns the existing row for *provider_key*, creating a CLOSED one if absent."""
        return await cb_repo.get_or_create(
            db,
            provider_key,
            threshold=self._settings_threshold(),
            cooldown=self._settings_cooldown(),
        )

    async def before_call(
        self,
        db: AsyncSession,
        provider_key: str,
    ) -> None:
        """Check and transition circuit state before an LLM call.

        Must be called before every LLM call. Raises
        :class:`CircuitBreakerOpenError` if the circuit is OPEN.

        Args:
            db: Active async database session.
            provider_key: Unique provider identifier (e.g. ``"openrouter"``).

        Raises:
            CircuitBreakerOpenError: The circuit is OPEN – call blocked.
        """
        cb = await self._get_or_create(db, provider_key)

        if cb.state == CIRCUIT_CLOSED:
            return

        if cb.state == CIRCUIT_OPEN:
            cooldown = cb.cooldown_seconds
            threshold = getattr(settings, "CIRCUIT_BREAKER_COOLDOWN_SECONDS", cooldown)
            if cb.opened_at is not None:
                elapsed = (datetime.now(UTC) - cb.opened_at).total_seconds()
                if elapsed >= threshold:
                    await cb_repo.save_state(
                        db,
                        provider_key,
                        state=CIRCUIT_HALF_OPEN,
                        failure_count=cb.failure_count,
                        opened_at=cb.opened_at,
                        last_probe_at=datetime.now(UTC),
                    )
                    logger.info(
                        "Circuit Breaker: %s OPEN→HALF_OPEN (cooldown elapsed, probe allowed)",
                        provider_key,
                    )
                    return

            raise CircuitBreakerOpenError(f"Circuit breaker is OPEN for provider '{provider_key}'")

        # HALF_OPEN – allow the call (single probe)
        return

    async def on_success(self, db: AsyncSession, provider_key: str) -> None:
        """Transition circuit to CLOSED after a successful call.

        Resets the failure counter.

        Args:
            db: Active async database session.
            provider_key: Unique provider identifier.
        """
        cb = await self._get_or_create(db, provider_key)
        await cb_repo.save_state(
            db,
            provider_key,
            state=CIRCUIT_CLOSED,
            failure_count=0,
            opened_at=None,
            last_probe_at=cb.last_probe_at,
        )
        logger.info("Circuit Breaker: %s → CLOSED (success)", provider_key)

    async def on_failure(self, db: AsyncSession, provider_key: str) -> None:
        """Increment failure counter and open circuit if threshold reached.

        Args:
            db: Active async database session.
            provider_key: Unique provider identifier.
        """
        cb = await self._get_or_create(db, provider_key)
        failure_count = cb.failure_count + 1
        threshold = getattr(settings, "CIRCUIT_BREAKER_THRESHOLD", cb.threshold)

        if failure_count >= threshold:
            await cb_repo.save_state(
                db,
                provider_key,
                state=CIRCUIT_OPEN,
                failure_count=failure_count,
                opened_at=datetime.now(UTC),
                last_probe_at=cb.last_probe_at,
            )
            logger.warning(
                "Circuit Breaker: %s → OPEN (failure_count=%d, threshold=%d)",
                provider_key,
                failure_count,
                threshold,
            )
        else:
            await cb_repo.save_state(
                db,
                provider_key,
                state=cb.state,
                failure_count=failure_count,
                opened_at=cb.opened_at,
                last_probe_at=cb.last_probe_at,
            )
            logger.info(
                "Circuit Breaker: %s failure_count=%d (threshold=%d)",
                provider_key,
                failure_count,
                threshold,
            )

    async def get_all(self, db: AsyncSession) -> list[CircuitBreakerRecord]:
        """Return all circuit breaker rows.

        Args:
            db: Active async database session.

        Returns:
            List of all circuit breaker records.
        """
        return await cb_repo.list_all(db)

    async def reset(self, db: AsyncSession, provider_key: str) -> CircuitBreakerRecord:
        """Manually reset a circuit breaker to CLOSED.

        Args:
            db: Active async database session.
            provider_key: Unique provider identifier.

        Returns:
            The updated circuit breaker record.
        """
        cb = await self._get_or_create(db, provider_key)
        reset = await cb_repo.save_state(
            db,
            provider_key,
            state=CIRCUIT_CLOSED,
            failure_count=0,
            opened_at=None,
            last_probe_at=cb.last_probe_at,
        )
        logger.info("Circuit Breaker: %s manually reset → CLOSED", provider_key)
        return reset

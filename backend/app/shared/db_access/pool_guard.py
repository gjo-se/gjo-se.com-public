"""Connection pool guard – prevents pool exhaustion by selective consumer blocking.

When the pool reaches 75% utilisation, the guard identifies the consumer
with the most active checkouts and blocks **new** checkouts only for that
consumer.  Other consumers continue to work, keeping the system alive.

Once utilisation drops below 50%, the blocked consumer is unblocked.

Architecture
------------
- ``PoolGuard`` is a module-level singleton that tracks active checkouts
  per consumer label (see :mod:`app.shared.db_access.consumer_label`).
- SQLAlchemy ``checkout`` / ``checkin`` pool events drive the counters.
- Registration happens once in :func:`app.shared.db_access.session.init_pool_guard`.

Usage
-----
No code changes needed in most places – the guard automatically attributes
checkouts via the ``consumer_label`` ContextVar.  Callers only need to set
the label before DB access (done by FastAPI middleware and Restate activities).
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING, Any, cast

import structlog

if TYPE_CHECKING:
    from sqlalchemy.pool import ConnectionPoolEntry

logger = structlog.get_logger(__name__)


class PoolGuardBlockedError(RuntimeError):
    """A consumer was blocked because the pool is congested."""


class PoolGuard:
    """Tracks active checkout counts per consumer label and enforces limits.

    Thread-safe via ``threading.Lock`` – sufficient because SQLAlchemy pool
    events are dispatched synchronously within the asyncio event loop.
    """

    def __init__(
        self,
        pool_size: int,
        max_overflow: int,
        high_watermark_pct: float = 0.75,
        unblock_pct: float = 0.50,
    ) -> None:
        self._pool_size = pool_size
        self._max_overflow = max_overflow
        self._total_pool = pool_size + max_overflow
        self._high_watermark = int(self._total_pool * high_watermark_pct)
        self._unblock_at = int(self._total_pool * unblock_pct)

        self._lock = threading.Lock()
        #: dict[consumer_label → active_checkout_count]
        self._active: dict[str, int] = {}
        #: Set of currently blocked consumer labels
        self._blocked: set[str] = set()

        logger.info(
            "pool_guard.initialised",
            pool_size=pool_size,
            max_overflow=max_overflow,
            total_pool=self._total_pool,
            high_watermark=self._high_watermark,
            unblock_at=self._unblock_at,
        )

    # ── SQLAlchemy event handlers ─────────────────────────────────────────

    def on_checkout(
        self,
        _dbapi_connection: object,
        connection_record: ConnectionPoolEntry,
        _connection_proxy: object,
    ) -> None:
        """Pool checkout event – increment counter for the current consumer.

        Args:
            _dbapi_connection: Low-level DBAPI connection (unused).
            connection_record: SQLAlchemy ``ConnectionPoolEntry``.
            _connection_proxy: Proxied connection (unused).
        """
        from app.shared.db_access.consumer_label import get_consumer_label

        label = get_consumer_label()
        self._checkout(label, connection_record)

    def on_checkin(
        self,
        _dbapi_connection: object,
        connection_record: ConnectionPoolEntry,
    ) -> None:
        """Pool checkin event – decrement counter for the consumer.

        Args:
            _dbapi_connection: Low-level DBAPI connection (unused).
            connection_record: SQLAlchemy ``ConnectionPoolEntry``.
        """
        consumer_label = getattr(connection_record, "_pool_guard_label", "unknown")
        self._checkin(consumer_label)
        # ── Prometheus gauge update ────────────────────────────────────
        from app.shared.observability.infrastructure.observability_metrics_client import DB_POOL_ACTIVE

        DB_POOL_ACTIVE.set(sum(self._active.values()))

    # ── Internal ──────────────────────────────────────────────────────────

    def _checkout(self, label: str, record: ConnectionPoolEntry) -> None:
        """Register a checkout for *label*, blocking if necessary.

        Raises:
            PoolGuardBlockedError: The consumer is currently blocked.
        """
        with self._lock:
            # Check if this consumer is blocked
            if label in self._blocked:
                raise PoolGuardBlockedError(f"Connection pool congested – consumer '{label}' is temporarily blocked")

            self._active[label] = self._active.get(label, 0) + 1
            total = sum(self._active.values())

        # Store the label on the record for later checkin attribution
        cast(Any, record)._pool_guard_label = label

        # ── Prometheus gauge ──────────────────────────────────────────
        from app.shared.observability.infrastructure.observability_metrics_client import DB_POOL_ACTIVE

        DB_POOL_ACTIVE.set(total)

        # Check watermarks (outside lock – idempotent)
        if total >= self._high_watermark:
            self._maybe_block_top_consumer(total)

    def _checkin(self, label: str) -> None:
        """Register a checkin, possibly unblocking the consumer."""
        with self._lock:
            current = self._active.get(label, 0)
            if current > 0:
                self._active[label] = current - 1
            if self._active[label] == 0:
                self._active.pop(label, None)

            total = sum(self._active.values())

        # Unblock if utilisation dropped
        if total <= self._unblock_at and self._blocked:
            self._maybe_unblock(total)

    def _maybe_block_top_consumer(self, total: int) -> None:
        """Identify and block the consumer with the most active checkouts."""
        with self._lock:
            if not self._active:
                return

            top_label, top_count = max(self._active.items(), key=lambda kv: kv[1])

            # Only block if the top consumer is significantly ahead
            # AND the pool is really congested (>= high watermark)
            if top_label not in self._blocked:
                self._blocked.add(top_label)
                from app.shared.observability.infrastructure.observability_metrics_client import (
                    DB_POOL_BLOCKED_CONSUMERS,
                )

                DB_POOL_BLOCKED_CONSUMERS.set(len(self._blocked))
                logger.warning(
                    "pool_guard.blocked",
                    consumer=top_label,
                    active_checkouts=top_count,
                    total_checkouts=total,
                    total_pool=self._total_pool,
                )

    def _maybe_unblock(self, total: int) -> None:
        """Unblock all consumers when utilisation drops below threshold."""
        with self._lock:
            if not self._blocked:
                return
            freed = list(self._blocked)
            self._blocked.clear()
            from app.shared.observability.infrastructure.observability_metrics_client import DB_POOL_BLOCKED_CONSUMERS

            DB_POOL_BLOCKED_CONSUMERS.set(0)
            logger.info(
                "pool_guard.unblocked",
                consumers=freed,
                total_checkouts=total,
                total_pool=self._total_pool,
            )

    # ── Diagnostic ────────────────────────────────────────────────────────

    def get_stats(self) -> dict[str, object]:
        """Return a snapshot for monitoring / health endpoints."""
        with self._lock:
            return {
                "active": dict(self._active),
                "total": sum(self._active.values()),
                "blocked": sorted(self._blocked),
                "total_pool": self._total_pool,
                "high_watermark": self._high_watermark,
                "unblock_at": self._unblock_at,
            }

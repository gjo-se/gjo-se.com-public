"""Service for computing observer metrics (latency, error rates, ticket counts).

Queries ``llm_call_log`` and ``observer_tickets`` tables and aggregates
per-task statistics with Python-side percentile computation for cross-database
compatibility.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog

from app.shared.db_access.db_consumer import DatabaseConsumer
from app.shared.llm_gateway.repositories import observer_metrics_repository

logger = structlog.get_logger(__name__)

# Fenster-Obergrenze (Stunden), bis zu der die mittlere Bucket-Auflösung gilt.
_MEDIUM_WINDOW_HOURS = 6

# In-memory cache with 30s TTL
_cache: dict[str, Any] = {"data": None, "ts": 0.0, "window": ""}
_CACHE_TTL = 30.0


class ObserverMetricsService(DatabaseConsumer):
    """Compute aggregated LLM metrics for the dashboard.

    Consumes an injected ``AsyncSession`` via :class:`DatabaseConsumer`.
    """

    async def compute(self, window: str) -> dict[str, Any]:
        """Return per-task metrics and timeline data.

        Args:
            window: Time window string (1h, 6h, 24h).

        Returns:
            Dict with ``tasks`` and ``timeline`` keys ready for serialisation.
        """
        # Check cache first
        global _cache  # noqa: PLW0603
        now = time.monotonic()
        if _cache["data"] is not None and _cache["window"] == window and (now - _cache["ts"]) < _CACHE_TTL:
            logger.debug("Metrics cache hit for window=%s (age=%.1fs)", window, now - _cache["ts"])
            return _cache["data"]  # type: ignore[no-any-return]

        hours = _parse_window_hours(window)
        cutoff = datetime.now(UTC) - timedelta(hours=hours)

        # Collect duration values per task
        call_rows = await self._fetch_call_logs(cutoff)

        # Compute percentiles in Python
        tasks = self._build_task_metrics(call_rows, cutoff)

        # Merge ticket counts
        ticket_counts = await self._fetch_ticket_counts()
        for t in tasks:
            t["ticket_count"] = ticket_counts.get(t["name"], 0)

        # Build timeline (hourly buckets)
        timeline = self._build_timeline(call_rows, cutoff, hours)

        data = {"tasks": tasks, "timeline": timeline}
        _cache = {"data": data, "ts": now, "window": window}
        return data

    # ── DB queries ────────────────────────────────────────────────────────────

    async def _fetch_call_logs(self, cutoff: datetime) -> list[dict[str, Any]]:
        """Return raw duration data for all tasks since *cutoff*.

        Returns:
            List of dicts with keys ``task``, ``duration_ms``, ``success``, ``created_at``.
        """
        records = await observer_metrics_repository.list_call_logs_since(self._db, cutoff)
        return [
            {
                "task": record.task,
                "duration_ms": record.duration_ms,
                "success": record.success,
                "created_at": record.created_at,
            }
            for record in records
        ]

    async def _fetch_ticket_counts(self) -> dict[str, int]:
        """Return {task: count} of open observer tickets."""
        return await observer_metrics_repository.ticket_counts_by_task(self._db)

    # ── Computation ───────────────────────────────────────────────────────────

    @staticmethod
    def _build_task_metrics(rows: list[dict[str, Any]], cutoff: datetime) -> list[dict[str, Any]]:
        """Aggregate rows into per-task statistics."""
        tasks: dict[str, dict[str, Any]] = {}
        for r in rows:
            t = tasks.setdefault(r["task"], {"durations": [], "errors": 0, "total": 0})
            if r["duration_ms"] is not None:
                t["durations"].append(r["duration_ms"])
            if r["success"] is False:
                t["errors"] += 1
            t["total"] += 1

        result: list[dict[str, Any]] = []
        for name, data in sorted(tasks.items()):
            d = sorted(data["durations"])
            result.append(
                {
                    "name": name,
                    "p50_ms": _percentile(d, 50) if d else None,
                    "p95_ms": _percentile(d, 95) if d else None,
                    "p99_ms": _percentile(d, 99) if d else None,
                    "error_rate": round(data["errors"] / data["total"], 4) if data["total"] else 0.0,
                    "ticket_count": 0,  # filled in later
                }
            )
        return result

    @staticmethod
    def _build_timeline(rows: list[dict[str, Any]], cutoff: datetime, window_hours: int) -> list[dict[str, Any]]:
        """Build hourly-bucketed time series for the latency chart."""
        from collections import defaultdict

        # Determine bucket count
        if window_hours <= 1:
            num_buckets = 6
            bucket_minutes = 10
        elif window_hours <= _MEDIUM_WINDOW_HOURS:
            num_buckets = 12
            bucket_minutes = 30
        else:
            num_buckets = 24
            bucket_minutes = 60

        # Group rows: {ts: {task: [durations]}}
        buckets: dict[datetime, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
        now = datetime.now(UTC)
        bucket_delta = timedelta(minutes=bucket_minutes)

        for r in rows:
            if r["duration_ms"] is None or r["created_at"] is None:
                continue
            age = now - r["created_at"]
            bucket_idx = int(age.total_seconds() / (bucket_minutes * 60))
            if bucket_idx < 0 or bucket_idx >= num_buckets:
                continue
            ts = now - bucket_delta * (bucket_idx + 1)
            ts = ts.replace(second=0, microsecond=0)
            buckets[ts][r["task"]].append(r["duration_ms"])

        timeline: list[dict[str, Any]] = []
        for ts, task_durations in sorted(buckets.items()):
            for task, durations in sorted(task_durations.items()):
                d = sorted(durations)
                timeline.append(
                    {
                        "ts": ts.isoformat(),
                        "task": task,
                        "p50_ms": _percentile(d, 50),
                        "p95_ms": _percentile(d, 95),
                        "p99_ms": _percentile(d, 99),
                    }
                )
        return timeline


# ── Helpers ───────────────────────────────────────────────────────────────────


def _percentile(sorted_values: list[int], pct: int) -> int | None:
    """Return the *pct*-th percentile from *sorted_values*.

    Uses nearest-rank method for simplicity and cross-database portability.
    """
    if not sorted_values:
        return None
    idx = max(0, int(len(sorted_values) * pct / 100.0) - 1)
    return sorted_values[min(idx, len(sorted_values) - 1)]


def _parse_window_hours(window: str) -> int:
    """Parse the window query parameter into hours."""
    mapping = {"1h": 1, "6h": 6, "24h": 24}
    return mapping.get(window, 24)

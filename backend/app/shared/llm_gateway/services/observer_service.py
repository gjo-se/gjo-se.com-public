"""Observer – periodic LLM anomaly detection and ticket creation.

The :class:`Observer` is invoked every 60 seconds by the arq cron job
:func:`run_observer`.  It computes a baseline p95 latency per task from
the last 24 hours of ``llm_call_log``, compares it against the most recent
data, and creates an observer ticket when a threshold is crossed.

All DB access lives in :mod:`...repositories.observer_repository`; the service
orchestrates anomalies over domain records and plain scalar values.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog

from app.shared.config.config import settings
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.repositories import observer_repository
from app.shared.llm_gateway.schemas.observer_schemas import ObserverTicketCreate
from app.shared.llm_gateway.services.observer_ticket_service import ObserverTicketService
from app.shared.notification.dependencies.notification_dependencies import get_notification_service
from app.shared.notification.services.notification_service import (
    SEVERITY_PRIORITY_MAP,
)

# Mindest-Stichprobe, damit ein p95-Wert berechnet wird (kleinere Mengen = None).
_MIN_SAMPLE_FOR_P95 = 3

# Cost-trigger window length in minutes (sliding 1h window).
_COST_WINDOW_MINUTES = 60

logger = structlog.get_logger(__name__)

# ── Configurable thresholds ───────────────────────────────────────────────────
_CRITICAL_MULTIPLIER = 2.0
_WARNING_MULTIPLIER = 1.5
_ERROR_RATE_THRESHOLD = 0.05
_MIN_SAMPLES_BASELINE = 10
_BASELINE_WINDOW_HOURS = 24
_RECENT_WINDOW_MINUTES = 10

# ── Ticket type / severity values (string boundary; the ORM enum stays a
#    models-detail and never crosses into the service layer) ───────────────────
_TICKET_TYPE_LATENCY_ANOMALY = "latency_anomaly"
_TICKET_TYPE_ERROR_SPIKE = "error_spike"
_TICKET_TYPE_COST_OVERRUN = "cost_overrun"
_SEVERITY_CRITICAL = "critical"
_SEVERITY_WARNING = "warning"


@dataclass
class _AnomalyResult:
    """Structured result of an anomaly check for a single task."""

    task: str
    severity: str
    ticket_type: str
    baseline_p95_ms: int
    current_p95_ms: int
    error_rate: float
    sample_count: int
    affected_trace_ids: list[str]
    diagnosis: str
    # Cost-trigger fields (only set by `_cost_check`). Defaults keep the
    # behaviour of the existing latency/error anomalies unchanged.
    transition: bool = True
    call_count_1h: int = 0
    cost_usd_1h: float = 0.0
    threshold_calls: int = 0
    threshold_cost: float = 0.0


class Observer:
    """Periodic anomaly detector for LLM call latency and error rates.

    Queries ``llm_call_log`` for baseline and recent metrics, compares
    against configurable thresholds, and creates observer tickets
    via :class:`ObserverTicketService`.
    """

    def __init__(self, db: AsyncSession, ticket_service: ObserverTicketService) -> None:
        self._db = db
        self._tickets = ticket_service

    async def run(self) -> list[Any]:
        """Entry point called by the arq cron job.

        Returns:
            List of created ticket records (empty if no anomalies).
        """
        tasks = await self._distinct_tasks()
        if not tasks:
            logger.debug("Observer: no tasks with recent data, skipping.")
            return []

        created: list[Any] = []
        for task in tasks:
            anomalies = [
                *await self._check_task(task),
                *await self._cost_check(task),
            ]
            for anomaly in anomalies:
                ticket = await self._create_ticket(anomaly)
                if ticket is not None:
                    created.append(ticket)
                    await self._push_anomaly(anomaly)
        return created

    # ── DB queries ────────────────────────────────────────────────────────────

    async def _distinct_tasks(self) -> list[str]:
        """Return all task keys that have data in the baseline window."""
        cutoff = datetime.now(UTC) - timedelta(hours=_BASELINE_WINDOW_HOURS)
        return await observer_repository.list_recent_tasks(self._db, cutoff)

    async def _baseline_p95(self, task: str) -> float | None:
        """Compute the p95 duration_ms for *task* in the baseline window.

        Excludes the recent window so anomalies don't inflate their own baseline.
        Uses a sorted-list percentile approach for cross-database portability.
        """
        now = datetime.now(UTC)
        cutoff = now - timedelta(hours=_BASELINE_WINDOW_HOURS)
        recent_cutoff = now - timedelta(minutes=_RECENT_WINDOW_MINUTES)
        values = sorted(
            await observer_repository.baseline_durations(
                self._db,
                task,
                cutoff=cutoff,
                recent_cutoff=recent_cutoff,
            )
        )
        if len(values) < _MIN_SAMPLES_BASELINE:
            return None
        idx = int(len(values) * 0.95)
        return float(values[min(idx, len(values) - 1)])

    async def _recent_metrics(self, task: str) -> dict[str, Any]:
        """Return p95, error_rate, sample_count, and trace IDs for recent calls."""
        cutoff = datetime.now(UTC) - timedelta(minutes=_RECENT_WINDOW_MINUTES)
        rows = await observer_repository.recent_call_logs(self._db, task, cutoff)

        durations = [r.duration_ms for r in rows if r.duration_ms is not None]
        errors = [r for r in rows if r.success is False]
        dur_sorted = sorted(durations)
        p95 = dur_sorted[int(len(dur_sorted) * 0.95)] if dur_sorted and len(dur_sorted) >= _MIN_SAMPLE_FOR_P95 else None

        return {
            "p95_ms": p95,
            "error_rate": len(errors) / len(rows) if rows else 0.0,
            "sample_count": len(rows),
            "trace_ids": [str(r.id) for r in rows[:5]],  # use call_log ids as trace reference
        }

    # ── Cost trigger ──────────────────────────────────────────────────────────

    async def _resolve_price_per_1m(self, resolved_model: str) -> tuple[float, float] | None:
        """Resolve the latest price snapshot (USD per 1M tokens) for a model.

        Maps ``resolved_model`` to a model via ``openrouter_id`` OR
        ``native_model_id``, then takes the newest snapshot by ``synced_at``.

        Returns:
            ``(price_input, price_output)`` per 1M tokens, or ``None`` if no
            model or no snapshot is resolvable. Callers must skip (not zero-cost)
            calls with an unresolvable price.
        """
        return await observer_repository.resolve_price_per_1m(self._db, resolved_model)

    async def _hour_window(self, task: str, offset_minutes: int = 0) -> dict[str, Any]:
        """Aggregate call count and cost for *task* over a sliding 1h window.

        Window is ``[now - 1h - offset, now - offset]``. ``offset_minutes``
        lets callers inspect the previous hour (offset=60) for transition logic.

        Returns:
            ``{"call_count": int, "cost_usd": float}``. ``call_count`` counts
            ALL calls (independent of token/price data). ``cost_usd`` only sums
            calls that have token counts AND a resolvable price snapshot.
        """
        now = datetime.now(UTC)
        window_end = now - timedelta(minutes=offset_minutes)
        window_start = window_end - timedelta(hours=1)
        rows = await observer_repository.hour_window_call_logs(
            self._db,
            task,
            window_start=window_start,
            window_end=window_end,
        )

        call_count = len(rows)
        cost_usd = 0.0
        for row in rows:
            if row.prompt_tokens is None or row.completion_tokens is None:
                continue
            if not row.resolved_model:
                continue
            prices = await self._resolve_price_per_1m(row.resolved_model)
            if prices is None:
                continue
            price_input, price_output = prices
            cost_usd += (row.prompt_tokens / 1_000_000) * price_input
            cost_usd += (row.completion_tokens / 1_000_000) * price_output

        return {"call_count": call_count, "cost_usd": cost_usd}

    async def _cost_check(self, task: str) -> list[_AnomalyResult]:
        """Check call count and cost against the absolute 1h thresholds.

        Runs independently of the latency/error baseline checks so a task
        without a baseline is still protected against runaway cost/volume.
        """
        current = await self._hour_window(task, 0)
        prev = await self._hour_window(task, _COST_WINDOW_MINUTES)

        limit_calls = settings.LLM_ALERT_MAX_CALLS_PER_HOUR
        limit_cost = settings.LLM_ALERT_MAX_COST_PER_HOUR

        over_calls = current["call_count"] > limit_calls
        over_cost = current["cost_usd"] > limit_cost
        if not (over_calls or over_cost):
            return []

        transition = prev["call_count"] <= limit_calls and prev["cost_usd"] <= limit_cost

        # Diagnosis names only the exceeded edge(s).
        parts: list[str] = []
        if over_calls:
            parts.append(f"{current['call_count']} Calls/h (Limit {limit_calls})")
        if over_cost:
            parts.append(f"{current['cost_usd']:.2f} USD/h (Limit {limit_cost:.2f})")
        diagnosis = f"Kosten-Trigger: {' bzw. '.join(parts)} – mögliche Dauerschleife"

        return [
            _AnomalyResult(
                task=task,
                severity=_SEVERITY_CRITICAL,
                ticket_type=_TICKET_TYPE_COST_OVERRUN,
                baseline_p95_ms=0,
                current_p95_ms=0,
                error_rate=0.0,
                sample_count=current["call_count"],
                affected_trace_ids=[],
                transition=transition,
                call_count_1h=current["call_count"],
                cost_usd_1h=current["cost_usd"],
                threshold_calls=limit_calls,
                threshold_cost=limit_cost,
                diagnosis=diagnosis,
            )
        ]

    # ── Anomaly detection ─────────────────────────────────────────────────────

    async def _check_task(self, task: str) -> list[_AnomalyResult]:
        """Run all anomaly checks for a single task and return findings."""
        baseline = await self._baseline_p95(task)
        if baseline is None:
            logger.debug("Observer: task=%s has < %d samples – skipping.", task, _MIN_SAMPLES_BASELINE)
            return []

        recent = await self._recent_metrics(task)
        if recent["p95_ms"] is None:
            logger.debug("Observer: task=%s has no recent p95 data.", task)
            return []

        anomalies: list[_AnomalyResult] = []

        current_p95 = recent["p95_ms"]

        # Latency anomaly: critical
        if current_p95 > _CRITICAL_MULTIPLIER * baseline:
            anomalies.append(
                _AnomalyResult(
                    task=task,
                    severity=_SEVERITY_CRITICAL,
                    ticket_type=_TICKET_TYPE_LATENCY_ANOMALY,
                    baseline_p95_ms=int(baseline),
                    current_p95_ms=current_p95,
                    error_rate=recent["error_rate"],
                    sample_count=recent["sample_count"],
                    affected_trace_ids=recent["trace_ids"],
                    diagnosis=(
                        f"p95 latency {current_p95}ms > {_CRITICAL_MULTIPLIER}× baseline "
                        f"({int(baseline)}ms) – immediate investigation required"
                    ),
                )
            )

        # Latency anomaly: warning
        elif current_p95 > _WARNING_MULTIPLIER * baseline:
            anomalies.append(
                _AnomalyResult(
                    task=task,
                    severity=_SEVERITY_WARNING,
                    ticket_type=_TICKET_TYPE_LATENCY_ANOMALY,
                    baseline_p95_ms=int(baseline),
                    current_p95_ms=current_p95,
                    error_rate=recent["error_rate"],
                    sample_count=recent["sample_count"],
                    affected_trace_ids=recent["trace_ids"],
                    diagnosis=(
                        f"p95 latency {current_p95}ms > {_WARNING_MULTIPLIER}× baseline "
                        f"({int(baseline)}ms) – investigation recommended"
                    ),
                )
            )

        # Error spike
        if recent["error_rate"] > _ERROR_RATE_THRESHOLD:
            anomalies.append(
                _AnomalyResult(
                    task=task,
                    severity=_SEVERITY_WARNING,
                    ticket_type=_TICKET_TYPE_ERROR_SPIKE,
                    baseline_p95_ms=int(baseline),
                    current_p95_ms=current_p95,
                    error_rate=recent["error_rate"],
                    sample_count=recent["sample_count"],
                    affected_trace_ids=recent["trace_ids"],
                    diagnosis=(f"Error rate {recent['error_rate']:.0%} exceeds {_ERROR_RATE_THRESHOLD:.0%} threshold"),
                )
            )

        return anomalies

    # ── Push notification ─────────────────────────────────────────────────────

    async def _push_anomaly(self, anomaly: _AnomalyResult) -> None:
        """Send a ntfy push for a newly created anomaly ticket.

        Best-effort and fully decoupled from the ticket flow: failures are
        logged but never raised, so they cannot interrupt the Observer loop.

        Gates (all must be true):
        - ``anomaly.transition is True`` – hysteresis: only the 0→1 transition
          triggers a push; a continuous run stays silent after the first one.
        - ``settings.LLM_ALERT_PUSH_ENABLED`` – kill switch in ``.env``.
          (Dedup – ticket is not None – is guaranteed by the caller.)
        """
        if anomaly.transition is not True:
            logger.debug(
                "Observer: skipping push for task=%s type=%s (transition=False)",
                anomaly.task,
                anomaly.ticket_type,
            )
            return
        if not settings.LLM_ALERT_PUSH_ENABLED:
            logger.debug("Observer: LLM_ALERT_PUSH_ENABLED=false – push suppressed.")
            return

        priority = SEVERITY_PRIORITY_MAP.get(anomaly.severity, 4)
        title = f"LLM-Anomalie: {anomaly.task} ({anomaly.ticket_type})"
        click_url = f"{settings.FRONTEND_URL}/admin/observer"
        try:
            await get_notification_service().send_push(
                title=title,
                message=anomaly.diagnosis,
                url=click_url,
                priority=priority,
                feature="observer",
            )
            logger.info(
                "Observer: push sent for task=%s type=%s",
                anomaly.task,
                anomaly.ticket_type,
            )
        except Exception:
            logger.exception("Observer: push failed – ticket flow unaffected")

    # ── Ticket creation ───────────────────────────────────────────────────────

    async def _create_ticket(self, anomaly: _AnomalyResult) -> object | None:
        """Create an observer ticket if a duplicate is not already open.

        Args:
            anomaly: The detected anomaly result.

        Returns:
            The created ticket record or ``None`` if a duplicate exists.
        """
        existing = await self._tickets.find_open_by_task_and_type(
            task=anomaly.task,
            ticket_type=anomaly.ticket_type,
        )
        if existing is not None:
            logger.debug(
                "Observer: skipping duplicate ticket for task=%s type=%s (existing id=%d)",
                anomaly.task,
                anomaly.ticket_type,
                existing.id,
            )
            return None

        langfuse_url = self._build_langfuse_trace_url(anomaly.affected_trace_ids)
        if anomaly.ticket_type == _TICKET_TYPE_COST_OVERRUN:
            anomaly_details: dict[str, Any] = {
                "call_count_1h": anomaly.call_count_1h,
                "cost_usd_1h": anomaly.cost_usd_1h,
                "threshold_calls": anomaly.threshold_calls,
                "threshold_cost": anomaly.threshold_cost,
                "window_minutes": _COST_WINDOW_MINUTES,
                "transition": anomaly.transition,
            }
        else:
            anomaly_details = {
                "baseline_p95_ms": anomaly.baseline_p95_ms,
                "current_p95_ms": anomaly.current_p95_ms,
                "threshold_multiplier": _CRITICAL_MULTIPLIER
                if anomaly.severity == _SEVERITY_CRITICAL
                else _WARNING_MULTIPLIER,
                "window_hours": _BASELINE_WINDOW_HOURS,
                "sample_count": anomaly.sample_count,
                "error_rate": anomaly.error_rate,
                "affected_trace_ids": anomaly.affected_trace_ids,
            }
        return await self._tickets.create(
            ObserverTicketCreate(
                ticket_type=anomaly.ticket_type,
                severity=anomaly.severity,
                task=anomaly.task,
                anomaly_details=anomaly_details,
                diagnosis=anomaly.diagnosis,
                langfuse_trace_url=langfuse_url or None,
            )
        )

    @staticmethod
    def _build_langfuse_trace_url(trace_ids: list[str]) -> str | None:
        """Build a deep-link to the LangFuse trace view.

        Uses ``LANGFUSE_HOST`` and ``LANGFUSE_PROJECT_ID`` from the environment.
        """
        import os

        host = os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL")
        project_id = os.getenv("LANGFUSE_PROJECT_ID")
        if not host or not project_id or not trace_ids:
            return None
        # Link to the first affected trace
        return f"{host.rstrip('/')}/project/{project_id}/traces/{trace_ids[0]}"

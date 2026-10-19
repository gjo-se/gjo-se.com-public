"""Audit checker – data integrity validation for LLM call logs.

Used by Gate 1e to verify that every executed LLM call is properly
logged, and to classify any discrepancies.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.repositories import call_log_repository

logger = structlog.get_logger(__name__)

_ERROR_TYPE_CIRCUIT_OPEN = "circuit_open"
_RETRY_STATUS_DEAD = "dead"


@dataclass
class AuditDiscrepancy:
    """Breakdown of classified discrepancies.

    Attributes:
        cb_count: Calls blocked by circuit breaker.
        dlq_count: Calls in dead-letter queue (retry exhausted).
        pending_count: Calls still pending (no result yet).
        missing_count: Unclassified missing log entries.
    """

    cb_count: int = 0
    dlq_count: int = 0
    pending_count: int = 0
    missing_count: int = 0

    @property
    def total_classified(self) -> int:
        """Sum of classified discrepancies (CB + DLQ + pending)."""
        return self.cb_count + self.dlq_count + self.pending_count


@dataclass
class AuditResult:
    """Result of an audit completeness check.

    Attributes:
        expected: Number of calls expected in the window.
        actual: Number of calls actually logged.
        discrepancy: Difference (expected - actual, floored at 0).
        classification: Breakdown of the discrepancy.
    """

    expected: int
    actual: int
    discrepancy: int
    classification: AuditDiscrepancy = field(default_factory=AuditDiscrepancy)


class AuditChecker:
    """Validates that every LLM call is properly logged and classifies gaps.

    Usage::

        from app.shared.llm_gateway.services.audit_checker_service import audit_checker

        result = await audit_checker.check(db, "description-merge", expected_count=100)
    """

    async def check(
        self,
        db: AsyncSession,
        task_key: str,
        expected_count: int,
    ) -> AuditResult:
        """Count actual logs and classify any discrepancy.

        Args:
            db: Active async database session.
            task_key: Task identifier to audit.
            expected_count: How many calls are expected in the window.

        Returns:
            :class:`AuditResult` with expected, actual, discrepancy, and
            classification breakdown.
        """
        one_hour_ago = datetime.now(UTC) - timedelta(hours=1)

        # Total actual calls.
        actual = await call_log_repository.count_calls(db, task=task_key, since=one_hour_ago)

        # Circuit breaker: error_type = 'circuit_open'.
        cb_count = await call_log_repository.count_calls(
            db,
            task=task_key,
            since=one_hour_ago,
            error_type=_ERROR_TYPE_CIRCUIT_OPEN,
        )

        # Dead-letter queue: retry_status = 'dead'.
        dlq_count = await call_log_repository.count_calls(
            db,
            task=task_key,
            since=one_hour_ago,
            retry_status=_RETRY_STATUS_DEAD,
        )

        # Pending: no result yet (success IS NULL, error_type IS NULL, duration_ms IS NULL).
        pending_count = await call_log_repository.count_calls(db, task=task_key, since=one_hour_ago, pending=True)

        discrepancy = max(0, expected_count - actual)
        # Classified gaps: CB, DLQ, or pending. Truly missing = discrepancy
        # minus what's explained.
        classified = cb_count + dlq_count + pending_count
        missing_count = max(0, discrepancy - classified)

        classification = AuditDiscrepancy(
            cb_count=cb_count,
            dlq_count=dlq_count,
            pending_count=pending_count,
            missing_count=missing_count,
        )

        logger.info(
            "audit_checker: task='%s' expected=%d actual=%d cb=%d dlq=%d pending=%d missing=%d",
            task_key,
            expected_count,
            actual,
            cb_count,
            dlq_count,
            pending_count,
            missing_count,
        )

        return AuditResult(
            expected=expected_count,
            actual=actual,
            discrepancy=discrepancy,
            classification=classification,
        )

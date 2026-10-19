"""Gate 2b – verify that every LLM call is properly logged."""

from __future__ import annotations

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.services.gates.base import GATE_1F_EXPECTED_N_DEFAULT, GateResult


class AuditGate:
    """Gate 2b: verify that every LLM call is properly logged."""

    async def _gate_audit(
        self,
        db: AsyncSession,
        task_key: str,
    ) -> GateResult:
        """Verify that every LLM call is properly logged."""
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_audit_checker

        result = await get_audit_checker().check(
            db,
            task_key,
            GATE_1F_EXPECTED_N_DEFAULT,
        )

        classification = result.classification

        if result.discrepancy == 0:
            return GateResult(
                gate="2b",
                status="passed",
                score=1.0,
                details={
                    "expected": result.expected,
                    "actual": result.actual,
                    "discrepancy": 0,
                    "classification": {
                        "cb_count": classification.cb_count,
                        "dlq_count": classification.dlq_count,
                        "pending_count": classification.pending_count,
                        "missing_count": 0,
                    },
                },
            )

        if classification.missing_count == 0:
            return GateResult(
                gate="2b",
                status="passed",
                score=1.0,
                details={
                    "expected": result.expected,
                    "actual": result.actual,
                    "discrepancy": result.discrepancy,
                    "classification": {
                        "cb_count": classification.cb_count,
                        "dlq_count": classification.dlq_count,
                        "pending_count": classification.pending_count,
                        "missing_count": 0,
                    },
                },
            )

        score = result.actual / max(result.expected, 1)
        return GateResult(
            gate="2b",
            status="failed",
            score=round(min(1.0, score), 4),
            details={
                "expected": result.expected,
                "actual": result.actual,
                "discrepancy": result.discrepancy,
                "classification": {
                    "cb_count": classification.cb_count,
                    "dlq_count": classification.dlq_count,
                    "pending_count": classification.pending_count,
                    "missing_count": classification.missing_count,
                },
            },
        )

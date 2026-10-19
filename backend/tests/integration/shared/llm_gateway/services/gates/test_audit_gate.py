"""Integration tests for the audit gate 2b."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.gates.audit_gate import AuditGate


class _CheckerStub:
    """Audit checker double reporting no discrepancy."""

    async def check(self, _db: object, _task_key: str, expected: int) -> SimpleNamespace:
        """Return a discrepancy-free audit result."""
        classification = SimpleNamespace(cb_count=0, dlq_count=0, pending_count=0, missing_count=0)
        return SimpleNamespace(
            discrepancy=0,
            expected=expected,
            actual=expected,
            classification=classification,
        )


@pytest.mark.integration
async def test_audit_gate_passes_without_discrepancy(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A discrepancy-free audit result passes gate 2b."""
    monkeypatch.setattr(
        "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_audit_checker",
        _CheckerStub,
    )

    result = await AuditGate()._gate_audit(db_session, "inline-explain")

    assert result.status == "passed"

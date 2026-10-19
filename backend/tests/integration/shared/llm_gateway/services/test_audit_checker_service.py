"""Integration tests for the call-log data-integrity audit checker."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.services.audit_checker_service import AuditChecker


@pytest.mark.integration
async def test_check_reports_every_expected_call_as_missing_without_logs(db_session: AsyncSession) -> None:
    """With no logged calls the whole expectation is unclassified missing."""
    result = await AuditChecker().check(db_session, "description-merge", expected_count=5)

    assert result.expected == 5
    assert result.actual == 0
    assert result.discrepancy == 5
    assert result.classification.missing_count == 5


@pytest.mark.integration
async def test_check_classifies_circuit_open_gaps(db_session: AsyncSession) -> None:
    """A circuit-open row explains part of the discrepancy."""
    db_session.add(CallLog(task="description-merge", call_type="text", success=False, error_type="circuit_open"))
    db_session.add(CallLog(task="description-merge", call_type="text", success=True))
    await db_session.commit()

    result = await AuditChecker().check(db_session, "description-merge", expected_count=3)

    assert result.actual == 2
    assert result.discrepancy == 1
    assert result.classification.cb_count == 1
    assert result.classification.missing_count == 0


@pytest.mark.integration
async def test_check_forgets_other_tasks(db_session: AsyncSession) -> None:
    """Calls of other tasks are not counted towards the audited task."""
    db_session.add(CallLog(task="other-task", call_type="text", success=True))
    await db_session.commit()

    result = await AuditChecker().check(db_session, "description-merge", expected_count=1)

    assert result.actual == 0

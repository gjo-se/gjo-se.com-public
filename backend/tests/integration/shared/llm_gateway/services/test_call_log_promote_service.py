"""Integration tests for the call-log promotion service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.services import call_log_promote_service as promote_module
from app.shared.llm_gateway.services.call_log_promote_service import CallLogPromoteService


def _service() -> CallLogPromoteService:
    """Build a promote service with an unused embedding client."""
    return CallLogPromoteService(embedding_service=None)


@pytest.mark.integration
async def test_promote_rejects_an_unknown_call_log(db_session: AsyncSession) -> None:
    """Promoting a non-existent call log is rejected."""
    result = await _service().promote(db_session, 999_999, "golden")

    assert result.status == "rejected"
    assert result.validation_errors


@pytest.mark.integration
async def test_promote_rejects_golden_label_for_a_failed_call(db_session: AsyncSession) -> None:
    """A failed call cannot be labelled golden."""
    call_log = CallLog(task="description-merge", call_type="text", success=False, error_type="rate_limit")
    db_session.add(call_log)
    await db_session.commit()

    result = await _service().promote(db_session, call_log.id, "golden")

    assert result.status == "rejected"
    assert any("golden" in error for error in result.validation_errors)


@pytest.mark.integration
async def test_promote_rejects_when_langfuse_is_not_configured(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Promotion is rejected when LangFuse is unavailable."""
    monkeypatch.setattr(promote_module, "get_langfuse_client", lambda: None)
    call_log = CallLog(task="description-merge", call_type="text", success=True)
    db_session.add(call_log)
    await db_session.commit()

    result = await _service().promote(db_session, call_log.id, "failure")

    assert result.status == "rejected"


@pytest.mark.integration
async def test_unpromote_rejects_a_call_log_that_was_never_promoted(db_session: AsyncSession) -> None:
    """Un-promoting a row without promotion tracking is rejected."""
    call_log = CallLog(task="description-merge", call_type="text", success=True)
    db_session.add(call_log)
    await db_session.commit()

    result = await _service().unpromote(db_session, call_log.id)

    assert result.status == "rejected"

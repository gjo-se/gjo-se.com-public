"""Unit tests for the call-log model and its error-type enums."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.models.call_log import CallErrorType, CallLog, CallRetryStatus, CallType


@pytest.mark.unit
def test_call_error_type_contains_unknown_fallback() -> None:
    """Every unclassified failure maps to the stable 'unknown' bucket."""
    assert CallErrorType.UNKNOWN.value == "unknown"
    assert CallErrorType.RATE_LIMIT.value == "rate_limit"


@pytest.mark.unit
def test_call_type_distinguishes_structured_text_stream() -> None:
    """Call type separates the three invocation kinds of the pipeline."""
    assert {c.value for c in CallType} == {"structured", "text", "stream"}


@pytest.mark.unit
def test_call_retry_status_enumerates_dlq_lifecycle() -> None:
    """Retry status covers pending, running, completed and dead."""
    assert {s.value for s in CallRetryStatus} == {"pending", "running", "completed", "dead"}


@pytest.mark.unit
def test_call_log_table_contract_binds_required_columns() -> None:
    """The call-log row marks task/call_type non-null and success nullable (pending)."""
    table = CallLog.__table__
    assert table.name == "shared_call_log"
    assert table.c.task.nullable is False
    assert table.c.call_type.nullable is False
    assert table.c.success.nullable is True
    assert table.c.retry_count.nullable is False

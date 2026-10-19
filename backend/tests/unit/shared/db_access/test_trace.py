"""Unit tests for the pipeline trace instrumentation."""

from __future__ import annotations

import pytest
from structlog.testing import capture_logs

from app.shared.db_access.trace import trace

pytestmark = pytest.mark.unit


def test_trace_emits_step_event_with_context() -> None:
    """trace logs the step as event and forwards the context key-values."""
    with capture_logs() as captured:
        trace("03_enqueue", project_id=42, invocation_id="inv_1")

    assert len(captured) == 1
    assert captured[0]["event"] == "03_enqueue"
    assert captured[0]["project_id"] == 42
    assert captured[0]["invocation_id"] == "inv_1"


def test_trace_without_context_still_emits_event() -> None:
    """trace works without additional context values."""
    with capture_logs() as captured:
        trace("00_start")

    assert captured[0]["event"] == "00_start"

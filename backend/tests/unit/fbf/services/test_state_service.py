"""Unit tests for the pipeline state TypedDict (fbf pipeline graph)."""

from __future__ import annotations

import pytest

from app.fbf.services.state_service import PipelineState

pytestmark = pytest.mark.unit


def test_state_declares_input_merge_and_outcome_fields() -> None:
    """The state carries the pipeline input, merge output and outcome fields."""
    declared = set(PipelineState.__annotations__)

    assert {"project_id", "merged_text", "skip_merge", "error", "status"} <= declared


def test_state_is_non_total_except_project_id() -> None:
    """Fields are optional so nodes can write incrementally – only project_id is required."""
    assert PipelineState.__total__ is False
    assert {"merged_text", "skip_merge", "error", "status"} <= set(PipelineState.__optional_keys__)

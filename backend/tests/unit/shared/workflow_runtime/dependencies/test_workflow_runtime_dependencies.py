"""Unit tests for the shared workflow_runtime composition-root provider."""

from __future__ import annotations

import pytest

from app.shared.workflow_runtime.dependencies.workflow_runtime_dependencies import get_act_tracker
from app.shared.workflow_runtime.infrastructure.restate.activities.pipeline_tracker import ActTracker

pytestmark = pytest.mark.unit


def test_get_act_tracker_builds_act_tracker_with_arguments() -> None:
    """The provider wires an ActTracker carrying project, phase and trigger."""
    tracker = get_act_tracker(7, "Act 1", trigger="button")

    assert isinstance(tracker, ActTracker)
    assert tracker.project_id == 7
    assert tracker.phase == "Act 1"
    assert tracker.trigger == "button"


def test_get_act_tracker_defaults_trigger_to_pipeline() -> None:
    """Without an explicit trigger the tracker records the pipeline default."""
    assert get_act_tracker(1, "Act 2").trigger == "pipeline"

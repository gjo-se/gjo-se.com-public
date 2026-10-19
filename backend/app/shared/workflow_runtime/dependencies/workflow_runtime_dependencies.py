"""Composition-root providers for the shared workflow_runtime."""

from __future__ import annotations

from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import (
    get_llm_call_log_service,
)
from app.shared.workflow_runtime.infrastructure.restate.activities.pipeline_tracker import (
    ActTracker,
)


def get_act_tracker(project_id: int, phase: str, trigger: str = "pipeline") -> ActTracker:
    """Provide a wired :class:`ActTracker` for a single workflow act.

    Args:
        project_id: Project the act belongs to.
        phase: Human-readable act phase (e.g. ``"Act 1"``).
        trigger: Trigger label recorded on the call-log row.

    Returns:
        A ready-to-use :class:`ActTracker` context manager.
    """
    return ActTracker(project_id, phase, get_llm_call_log_service(), trigger=trigger)

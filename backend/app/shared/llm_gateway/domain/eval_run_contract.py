"""Service↔repository boundary records for LLM evaluation runs.

The repository maps ``shared_eval_run`` rows to :class:`EvalRunRecord` so
``app.shared.llm_gateway.services`` stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class EvalRunRecord:
    """Immutable snapshot of one ``shared_eval_run`` row.

    Attributes:
        id: Primary key.
        task: Task key from ``TASK_REGISTRY``.
        model_config_id: FK to the evaluated candidate config.
        batch_id: Shared UUID grouping all candidates of one run.
        trigger: What triggered the run.
        gate_results: JSON list of per-gate result dicts.
        overall_status: Aggregate status (``passed``/``failed``/``blocked``).
        reviewer: Who performed the review.
        created_at: Row creation timestamp.
    """

    id: int
    task: str
    model_config_id: int | None
    batch_id: str | None
    trigger: str
    gate_results: list[dict[str, Any]] | None
    overall_status: str
    reviewer: str | None
    created_at: datetime

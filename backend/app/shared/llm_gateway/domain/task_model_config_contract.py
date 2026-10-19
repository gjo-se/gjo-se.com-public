"""Service↔repository boundary records for LLM task-model configurations.

The repository maps ``shared_task_model_config`` rows (with their eagerly
loaded model/provider/credential joins) to :class:`TaskModelConfigRecord` so
``app.shared.llm_gateway.services`` stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class TaskModelConfigRecord:
    """Immutable snapshot of one ``shared_task_model_config`` row.

    Attributes:
        id: Primary key.
        task: Task key from ``TASK_REGISTRY``.
        model_id: FK to the configured model.
        credential_id: FK to the credential (nullable).
        hyperparameters: Task-specific hyperparameter overrides.
        is_production: Row is the primary production model.
        is_fallback: Row is the fallback model.
        is_eval: Row is included in evaluation runs.
        is_judge: Row is the judge model for LLM-as-Judge evaluation.
        created_at: Row creation timestamp.
        updated_at: Row last-update timestamp.
        model_display_name: Display name of the joined model (read projection).
        provider_name: Display name of the joined provider (read projection).
        credential_label: Label of the joined credential (read projection).
    """

    id: int
    task: str
    model_id: int
    credential_id: int | None
    hyperparameters: dict[str, Any] | None
    is_production: bool
    is_fallback: bool
    is_eval: bool
    is_judge: bool
    created_at: datetime
    updated_at: datetime
    model_display_name: str | None = None
    provider_name: str | None = None
    credential_label: str | None = None

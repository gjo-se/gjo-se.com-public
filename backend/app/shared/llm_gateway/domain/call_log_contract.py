"""Service↔repository boundary records for the LLM call log.

The repository maps ``shared_call_log`` ORM rows to :class:`CallLogRecord` so
``app.shared.llm_gateway.services`` stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``). Plain dataclasses (not Pydantic) keep the ORM coupling out of
the generated frontend schemas and make the service boundary an explicit,
typed read model.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class CallLogRecord:
    """Immutable snapshot of one ``shared_call_log`` row.

    Attributes:
        id: Primary key.
        task: Task identifier.
        phase: Optional orchestration phase label.
        project_id: Optional originating project id.
        trigger: Optional trigger label.
        call_type: Invocation kind (``structured``/``text``/``stream``).
        success: Whether the call succeeded.
        error_type: Standardised error classification (failures only).
        error_message: Human-readable error detail (failures only).
        resolved_model: Resolved model identifier (when known).
        resolved_credential: Resolved credential service label (when known).
        duration_ms: Wall-clock duration in milliseconds.
        prompt_tokens: Prompt token usage of the call.
        completion_tokens: Completion token usage of the call.
        total_tokens: Total token usage of the call.
        created_at: Row creation timestamp.
        input_snapshot: Reproducible input dict for retry.
        retry_of_id: FK to the original row this retry belongs to.
        retry_count: 0 for originals, 1..N for retries.
        retry_status: Lifecycle status of a retry row.
        output_snapshot: The LLM response text.
        promoted_at: Timestamp when promoted to a LangFuse dataset.
        promoted_to: Dataset label (``golden``/``failure``).
        dataset_item_id: LangFuse dataset item id.
    """

    id: int
    task: str
    phase: str | None
    project_id: int | None
    trigger: str | None
    call_type: str
    success: bool | None
    error_type: str | None
    error_message: str | None
    resolved_model: str | None
    resolved_credential: str | None
    duration_ms: int | None
    prompt_tokens: int | None
    completion_tokens: int | None
    total_tokens: int | None
    created_at: datetime
    input_snapshot: dict[str, Any] | None
    retry_of_id: int | None
    retry_count: int
    retry_status: str | None
    output_snapshot: str | None
    promoted_at: datetime | None
    promoted_to: str | None
    dataset_item_id: str | None

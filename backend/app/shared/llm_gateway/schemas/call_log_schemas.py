"""Pydantic schemas for the LLM call log (admin views)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CallLogOut(BaseModel):
    """Admin view of a single ``llm_call_log`` row.

    Attributes:
        id: Primary key.
        task: Task identifier.
        project_id: Optional originating project id.
        trigger: Optional trigger label.
        call_type: Invocation kind (``structured``/``text``/``stream``).
        success: Whether the call succeeded.
        error_type: Standardised error classification (failures only).
        error_message: Human-readable error detail (failures only).
        resolved_model: Resolved model identifier (when known).
        resolved_credential: Resolved credential service label (when known).
        duration_ms: Wall-clock duration in milliseconds.
        prompt_tokens: Prompt token usage of the call (null for pre-189-1 rows).
        completion_tokens: Completion token usage of the call (null for pre-189-1 rows).
        total_tokens: Total token usage of the call (null for pre-189-1 rows).
        created_at: Row creation timestamp.
        input_snapshot: Reproducible input dict for retry (null for pre-INC-2 rows).
        retry_of_id: FK to the original ``llm_call_log.id`` this row retries (null for originals).
        retry_count: 0 for original calls, incremented for each retry.
        retry_status: Lifecycle status of a retry (null for original/success rows).
        output_snapshot: The LLM response text (null for rows logged before schema addition).
        promoted_at: Timestamp when promoted to LangFuse dataset (null if not promoted).
        promoted_to: Dataset label: 'golden' or 'failure' (null if not promoted).
        dataset_item_id: LangFuse dataset item id (null if not promoted).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    task: str
    phase: str | None = None
    project_id: int | None
    trigger: str | None
    call_type: str
    success: bool | None
    error_type: str | None
    error_message: str | None
    resolved_model: str | None
    resolved_credential: str | None
    duration_ms: int | None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    created_at: datetime
    input_snapshot: dict[str, Any] | None = None
    retry_of_id: int | None = None
    retry_count: int = 0
    retry_status: str | None = None
    output_snapshot: str | None = None
    promoted_at: datetime | None = None
    promoted_to: str | None = None
    dataset_item_id: str | None = None


class CallLogPaginatedResponse(BaseModel):
    """Paginated response for llm_call_log list with total count."""

    items: list[CallLogOut]
    total: int


class CallStatsOut(BaseModel):
    """Aggregation of call-log rows for the stats dashboard.

    Attributes:
        total: Total number of calls in the window.
        success: Number of successful calls.
        errors: Number of failed calls.
        by_error_type: Count per standardised error type (failures only).
    """

    total: int
    success: int
    errors: int
    by_error_type: dict[str, int]


class CallPurgeOut(BaseModel):
    """Result of a purge operation.

    Attributes:
        deleted: Number of rows removed.
    """

    deleted: int


class ObservabilityOut(BaseModel):
    """LangSmith observability configuration for the admin UI.

    Attributes:
        enabled: Whether LangSmith tracing is active.
        project: LangSmith project name traces are grouped under.
        url: Deep link to the LangSmith project dashboard (empty when disabled).
    """

    enabled: bool
    project: str
    url: str


class RetryBatchRequest(BaseModel):
    """Body for the batch retry endpoint.

    Attributes:
        ids: List of call-log row ids to retry (min 1, max 100).
    """

    ids: list[int]


class RetryBatchResponse(BaseModel):
    """Response for a successfully enqueued batch retry job.

    Attributes:
        job_id: arq job id for progress polling.
        queued_count: Number of ids that were enqueued (may be less
            than submitted when ``dead`` entries were filtered out).
    """

    job_id: str
    queued_count: int

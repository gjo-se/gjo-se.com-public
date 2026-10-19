"""Pydantic schemas for LLM task mapping management and trigger observation."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PlaceholderResponse(BaseModel):
    """Prompt placeholder definition from the task registry."""

    key: str
    label: str
    description: str
    category: str


class TaskDefinitionResponse(BaseModel):
    """Registry entry for a code-known LLM task."""

    key: str
    display_name: str
    description: str
    allowed_triggers: list[str] = Field(default_factory=list)
    placeholders: list[PlaceholderResponse] = Field(default_factory=list)


class TaskMappingResponse(BaseModel):
    """Current mapping for a task: model + credential assignment.

    A mapping may be a draft: ``model_id`` can be ``None`` until a model is
    chosen. A mapping only functions once ``model_id`` is set.
    """

    id: int | None = None
    model_id: int | None = None
    model_display_name: str | None = None
    credential_id: int | None = None
    credential_label: str | None = None
    credential_portal: str | None = None
    credential_provider: str | None = None
    active: bool = True
    status: str | None = None
    status_color_token: str | None = None


class TaskWithMappingResponse(BaseModel):
    """Task from the registry combined with its current mapping."""

    key: str
    display_name: str
    description: str
    allowed_triggers: list[str] = Field(default_factory=list)
    placeholders: list[PlaceholderResponse] = Field(default_factory=list)
    mapping: TaskMappingResponse | None = None
    active_prompt_version: int | None = Field(
        default=None,
        description="Version number of the active prompt template, or None if no prompt exists.",
    )


class TaskMappingUpsertIn(BaseModel):
    """Request body for creating or updating a task mapping.

    Both ``model_id`` and ``credential_id`` are optional so the model and
    provider dropdowns can be saved independently, in any order.
    """

    model_id: int | None = Field(default=None, description="ID des LLM-Modells (muss aktiv sein)")
    credential_id: int | None = Field(default=None, description="ID der Credential (optional, muss LLM-Typ sein)")


class TaskExecuteRequest(BaseModel):
    """Request body for manually executing an LLM task (admin debug/test)."""

    task: str = Field(..., description="Task key from TASK_REGISTRY")
    variables: dict[str, str] = Field(
        default_factory=dict,
        description="Placeholder values for the prompt template",
    )
    project_id: int = Field(..., description="Originating project id (call-log context)")


class TaskExecuteResponse(BaseModel):
    """Response body for a manual task execution."""

    success: bool
    result: object | None = None
    error_type: str | None = None


# ── Trigger Observer schemas ──────────────────────────────────────────────────


class TriggerObservationOut(BaseModel):
    """One row of observed trigger activity from the call log."""

    trigger: str
    count: int
    first_seen: datetime | None = None
    last_seen: datetime | None = None


class TriggerStatsResponse(BaseModel):
    """Aggregated trigger statistics: which are allowed, observed, unused."""

    task_key: str
    allowed: list[str]
    observed: list[TriggerObservationOut]
    unused: list[str]


class TaskExamplesResponse(BaseModel):
    """Input/output examples from the most recent call-log entries."""

    task_key: str
    input_example: dict[str, Any] | None = None
    output_schema: dict[str, Any] | None = None
    output_example: object | None = None


# ── Eval Runner schemas ──────────────────────────────────────────────────────


class EvalTriggerRequest(BaseModel):
    """Payload to manually trigger an evaluation run."""

    trigger: str = Field(default="manual", description="Auslöser (manual, prompt_change, model_change, ...)")


class EvalTriggerResponse(BaseModel):
    """Acknowledgement that an eval run was enqueued."""

    message: str
    task: str
    trigger: str


class EvalRunResponse(BaseModel):
    """Response model for an evaluation run (Gate 1a–2 results)."""

    id: int
    task: str
    model_config_id: int | None
    batch_id: str | None
    trigger: str
    gate_results: list[dict[str, Any]] | None
    overall_status: str
    reviewer: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Promote-to-dataset schemas ───────────────────────────────────────────────


class PromoteToDatasetRequest(BaseModel):
    """Payload to promote a call log to a LangFuse dataset."""

    label: str = Field(..., description="Label type: 'golden' or 'failure'")


class PromoteToDatasetResponse(BaseModel):
    """Result of a promote-to-dataset operation."""

    status: str = Field(..., description="'created', 'duplicate', or 'rejected'")
    message: str = Field(..., description="Human-readable status message")
    dataset_item_id: str | None = Field(default=None, description="LangFuse dataset item ID")
    duplicate_call_log_id: int | None = Field(
        default=None,
        description="ID of existing duplicate (only when status='duplicate')",
    )
    validation_errors: list[str] = Field(
        default_factory=list,
        description="Validation errors (only when status='rejected')",
    )

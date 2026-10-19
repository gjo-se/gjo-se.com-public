"""Pydantic schemas for LLM evaluation run history.

SSOT for the API layer – create payload and response for eval runs.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class EvalRunCreate(BaseModel):
    """Payload for creating a new evaluation run (called by EvaluationService)."""

    task: str = Field(..., description="Task-Key aus TASK_REGISTRY")
    model_config_id: int | None = Field(
        None,
        description="FK zum Kandidaten (TaskModelConfig)",
    )
    batch_id: str | None = Field(
        None,
        description="Shared UUID for all runs in the same batch",
    )
    trigger: str = Field(
        ...,
        description="Auslöser (manual, prompt_change, model_change, scheduled, eval_config_change)",
    )
    gate_results: list[dict[str, Any]] | None = Field(
        None,
        description="Pro Gate: status, score, details, timestamp",
    )
    overall_status: str = Field(..., description="Gesamtergebnis (passed, failed, blocked)")
    reviewer: str | None = Field(None, description="REX oder System-Name")


class EvalRunResponse(BaseModel):
    """Public-facing response model for an evaluation run."""

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

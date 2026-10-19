"""Pydantic schemas for versioned LLM prompt template management.

Covers prompt CRUD, version history, and activation.
"""

from __future__ import annotations

import json
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PromptVersionResponse(BaseModel):
    """Full prompt version with content and metadata.

    Attributes:
        id: Primary key.
        version: Sequential version number within the use-case.
        system_prompt: Optional system-level instruction.
        user_prompt: Mandatory user-level prompt text.
        placeholders: Parsed list of expected placeholder names, or ``None``.
        changelog: Human-readable change description, or ``None``.
        active: Whether this version is currently active.
        created_at: Row creation timestamp.
    """

    id: int
    version: int
    system_prompt: str | None = None
    user_prompt: str
    placeholders: list[str] | None = None
    changelog: str | None = None
    active: bool
    created_at: datetime

    @field_validator("placeholders", mode="before")
    @classmethod
    def parse_placeholders(cls, v: object) -> list[str] | None:
        """Parse placeholders from JSON string to list if needed."""
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                return None
        return None


class PromptVersionCreate(BaseModel):
    """Request body for creating a new prompt version.

    Attributes:
        system_prompt: Optional system-level instruction.
        user_prompt: Mandatory user-level prompt text.
        placeholders: Optional list of expected placeholder names.
        changelog: Optional human-readable change description.
    """

    system_prompt: str | None = Field(default=None, description="System Prompt (optional)")
    user_prompt: str = Field(..., min_length=1, description="User Prompt (Pflichtfeld)")
    placeholders: list[str] | None = Field(default=None, description="Platzhalter-Liste")
    changelog: str | None = Field(default=None, description="Was wurde geändert?")


class PromptVersionSummaryOut(BaseModel):
    """Lightweight version entry for the history list.

    Attributes:
        id: Primary key.
        version: Sequential version number.
        active: Whether this version is currently active.
        changelog: Human-readable change description, or ``None``.
        created_at: Row creation timestamp.
    """

    id: int
    version: int
    active: bool
    changelog: str | None = None
    created_at: datetime


class PromptWithHistoryResponse(BaseModel):
    """Combined response: active version + full history for a task.

    Attributes:
        task: Task key, e.g. ``"description-merge"``.
        active_version: The currently active version, or ``None`` if none exists.
        versions: All versions for this task (newest first).
    """

    task: str
    active_version: PromptVersionResponse | None = None
    versions: list[PromptVersionSummaryOut]

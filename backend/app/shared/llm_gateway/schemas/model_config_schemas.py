"""Pydantic schemas for the unified model configuration API.

Provides ``ModelConfigCreate``, ``ModelConfigUpdate``, and
``ModelConfigResponse`` for the ``TaskModelConfig`` table.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class ModelConfigCreate(BaseModel):
    """Payload for creating a new model configuration for a task."""

    model_id: int = Field(..., description="ID des LLM-Modells")
    credential_id: int | None = Field(
        None,
        description="Optionale Credential-ID",
    )
    hyperparameters: dict[str, Any] | None = Field(
        None,
        description="Task-spezifische Hyperparameter-Overrides (z.B. {'temperature': 0.3})",
    )
    is_production: bool = Field(False, description="Als Production-Modell setzen")
    is_fallback: bool = Field(False, description="Als Fallback-Modell setzen")
    is_eval: bool = Field(True, description="In Evaluation einbeziehen")

    @model_validator(mode="after")
    def _validate_mutual_exclusion(self) -> ModelConfigCreate:
        """Reject configs that are both production and fallback.

        Returns:
            The validated model instance.

        Raises:
            ValueError: If both ``is_production`` and ``is_fallback`` are set.
        """
        if self.is_production and self.is_fallback:
            raise ValueError("production and fallback are mutually exclusive")
        return self


class ModelConfigUpdate(BaseModel):
    """Payload for partial update of a model configuration.

    All fields are optional – only provided fields are changed.
    """

    model_id: int | None = Field(None, description="ID des LLM-Modells")
    credential_id: int | None = Field(
        None,
        description="Optionale Credential-ID",
    )
    hyperparameters: dict[str, Any] | None = Field(
        None,
        description="Task-spezifische Hyperparameter-Overrides",
    )
    is_production: bool | None = Field(None, description="Als Production-Modell setzen")
    is_fallback: bool | None = Field(None, description="Als Fallback-Modell setzen")
    is_eval: bool | None = Field(None, description="In Evaluation einbeziehen")

    @model_validator(mode="after")
    def _validate_mutual_exclusion(self) -> ModelConfigUpdate:
        """Reject partial updates that set both production and fallback.

        Only the fields actually provided are compared.

        Returns:
            The validated model instance.

        Raises:
            ValueError: If both ``is_production`` and ``is_fallback`` are true.
        """
        prod = self.is_production
        fallback = self.is_fallback
        if prod is not None and fallback is not None and prod and fallback:
            raise ValueError("production and fallback are mutually exclusive")
        return self


class ModelConfigResponse(BaseModel):
    """Public-facing response model for a model configuration row."""

    id: int
    task: str
    model_id: int
    credential_id: int | None
    hyperparameters: dict[str, Any] | None
    is_production: bool
    is_fallback: bool
    is_eval: bool
    created_at: datetime
    updated_at: datetime
    status: str | None = Field(
        None,
        description="Core-Status-Name (core_statusable, z. B. 'active')",
    )
    status_color_token: str | None = Field(
        None,
        description="Core-Status-Farbtoken (core_statusable)",
    )
    model_display_name: str | None = Field(
        None,
        description="Anzeigename des Modells (via JOIN)",
    )
    provider_name: str | None = Field(
        None,
        description="Provider-Name (via JOIN auf llm_model.provider)",
    )
    credential_label: str | None = Field(
        None,
        description="Label der Credential (via JOIN)",
    )

    model_config = {"from_attributes": True}

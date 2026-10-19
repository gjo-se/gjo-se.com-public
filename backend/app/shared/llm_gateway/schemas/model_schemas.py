"""Pydantic schemas for LLM model catalog and provider registry.

Covers models, pricing, and provider status.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, field_validator


class LLMProviderAdminResponse(BaseModel):
    """Admin view of a single provider row.

    Attributes:
        id: DB primary key.
        name: Provider identifier, e.g. ``'openai'``.
        display_name: Human-readable name.
        api_base: Base URL for direct API calls (nullable).
        created_at: Row creation timestamp.
    """

    id: int
    name: str
    display_name: str
    api_base: str | None = None
    created_at: datetime


class LLMProviderPatchRequest(BaseModel):
    """Partial update for a provider row (admin-only)."""

    api_base: str | None = None


class LLMProviderStatusResponse(BaseModel):
    """3-tier readiness status for a single provider (user-scoped).

    Attributes:
        id: DB primary key of the LLMProvider row.
        name: Provider identifier, e.g. ``'openai'``.
        display_name: Human-readable name.
        is_supported: True when provider is in PROVIDER_REGISTRY and its package is
            importable.
        has_key: True when the current user has stored an API key for this provider.
        key_valid: True when the stored key has been validated (``valid_at`` is set).
        key_label: Optional label of the stored key.
    """

    id: int
    name: str
    display_name: str
    is_supported: bool
    has_key: bool
    key_valid: bool
    key_label: str | None = None


class LLMModelResponse(BaseModel):
    """Full model record including current price info and OR metadata.

    Attributes:
        id: Primary key.
        openrouter_id: Composite OpenRouter ID, e.g. ``'openai/gpt-4o-mini'``.
        native_model_id: Provider-native ID, e.g. ``'gpt-4o-mini'``.
        provider_id: FK to llm_provider.
        provider_name: Provider identifier string.
        provider_display_name: Provider human-readable name.
        display_name: Model display name.
        description: Optional description.
        context_window: Max context length in tokens.
        active: Whether the model is enabled for use.
        current_price_input: Latest price per 1 M input tokens (USD).
        current_price_output: Latest price per 1 M output tokens (USD).
        first_seen_at: First sync timestamp.
        last_seen_at: Most recent sync timestamp.
        supported_parameters: OpenRouter supported parameters (JSON).
        architecture: OpenRouter model architecture info (JSON).
        reasoning: OpenRouter reasoning capability info (JSON).
        default_parameters: OpenRouter default parameters (JSON).
        top_provider: OpenRouter top provider info (JSON).
        max_completion_tokens: Maximum completion tokens.
        knowledge_cutoff: Knowledge cutoff date string, e.g. ``'2024-06'``.
        hugging_face_id: HuggingFace model ID, e.g. ``'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'``.
        created: Unix timestamp of model creation on OpenRouter.
        canonical_slug: URL-friendly model slug from OpenRouter.
        is_locally_installed: Whether the model is installed locally via Ollama.
        task_type: Model capability classification (coding, reasoning, vision, general).
        task_tags: JSON array of task tags.
        provider_installed: Whether the LangChain integration package for this
            model's provider is importable (``False`` = missing dependency).
    """

    id: int
    openrouter_id: str
    native_model_id: str
    provider_id: int
    provider_name: str
    provider_display_name: str
    display_name: str
    description: str | None
    context_window: int | None
    active: bool
    status: str | None = None
    status_color_token: str | None = None
    current_price_input: Decimal | None = None
    current_price_output: Decimal | None = None
    first_seen_at: datetime
    last_seen_at: datetime

    # OpenRouter fields
    supported_parameters: list[Any] | None = None
    architecture: dict[str, Any] | None = None
    reasoning: dict[str, Any] | None = None
    default_parameters: dict[str, Any] | None = None
    top_provider: dict[str, Any] | None = None
    max_completion_tokens: int | None = None
    knowledge_cutoff: str | None = None
    hugging_face_id: str | None = None
    created: int | None = None
    canonical_slug: str | None = None

    # Local installation
    is_locally_installed: bool = False

    # Benchmark fields
    task_type: str = "general"
    task_tags: str | None = None

    # Provider health
    provider_installed: bool = True


class LLMModelPatchIn(BaseModel):
    """Payload for PATCH /models/{id} – ``active`` and
    ``is_locally_installed`` are mutable.

    Attributes:
        active: New active state for the model.
        is_locally_installed: Manually override local installation status.
    """

    active: bool | None = None
    is_locally_installed: bool | None = None


class LLMModelPatchExtendedIn(BaseModel):
    """Extended patch payload for model updates.

    Allows updating both legacy fields (active, is_locally_installed)
    and new fields (task_type, task_tags).
    """

    active: bool | None = None
    is_locally_installed: bool | None = None
    task_type: str | None = None
    task_tags: str | None = None

    @field_validator("task_type")
    @classmethod
    def validate_task_type_optional(cls, v: str | None) -> str | None:
        """Ensure task_type is one of the allowed values when provided."""
        if v is None:
            return v
        valid_types = {"coding", "reasoning", "vision", "general"}
        if v not in valid_types:
            raise ValueError(f"task_type must be one of {sorted(valid_types)}")
        return v

    @field_validator("task_tags")
    @classmethod
    def validate_task_tags_optional(cls, v: str | None) -> str | None:
        """Ensure task_tags is a valid JSON string when provided."""
        if v is not None:
            try:
                import json

                json.loads(v)
            except (ValueError, TypeError) as exc:
                raise ValueError("task_tags must be a valid JSON array string or null") from exc
        return v


class LLMModelPriceSnapshotResponse(BaseModel):
    """A single price snapshot for a model.

    Attributes:
        id: Primary key.
        model_id: FK to llm_model.
        price_input: Price per 1 M input tokens (USD).
        price_output: Price per 1 M output tokens (USD).
        source: Data source (``'openrouter'``).
        synced_at: When this snapshot was recorded.
    """

    id: int
    model_id: int
    price_input: Decimal
    price_output: Decimal
    source: str
    synced_at: datetime


class ModelListCountResponse(BaseModel):
    """Count result for the /models/count endpoint.

    Attributes:
        total: Total number of models matching the applied filters.
    """

    total: int


class PaginatedModelsResponse(BaseModel):
    """Paginated list of LLM models with filter applied.

    Attributes:
        items: List of LLMModelResponse objects.
        total: Total count of matching models.
        skip: Number of items skipped (offset).
        limit: Number of items requested.
    """

    items: list[LLMModelResponse]
    total: int
    skip: int
    limit: int


class LLMSyncResultOut(BaseModel):
    """Result of a sync run.

    Attributes:
        providers_upserted: Number of LLMProvider rows created or updated.
        models_upserted: Number of LLMModel rows created or updated.
        snapshots_created: Number of new LLMModelPriceSnapshot rows inserted.
        models_skipped: Number of models skipped (filter / parse errors).
    """

    providers_upserted: int = 0
    models_upserted: int = 0
    snapshots_created: int = 0
    models_skipped: int = 0

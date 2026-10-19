"""Service↔repository boundary records for the LLM model catalog.

The repository maps ``shared_model`` rows (joined with their provider and latest
price snapshot) to :class:`ModelRecord` so
``app.shared.llm_gateway.services`` stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any


@dataclass(frozen=True)
class ModelFilter:
    """Filter parameters for the model catalog (shared by ``list_all``/``count``)."""

    provider_id: int | None = None
    q: str | None = None
    supports_structured_output: bool | None = None
    modality: str | None = None
    input_modality: str | None = None
    output_modality: str | None = None
    reasoning: bool | None = None
    is_active: bool | None = None
    price_min: float | None = None
    price_max: float | None = None


@dataclass(frozen=True, slots=True)
class ModelRecord:
    """Immutable read model of one ``shared_model`` row for the service boundary.

    Attributes:
        id: Primary key.
        openrouter_id: Composite OpenRouter model id.
        native_model_id: Provider-native model id.
        provider_id: FK to the provider row.
        provider_name: Provider identifier.
        provider_display_name: Human-readable provider name.
        display_name: Model display name.
        description: Optional model description.
        context_window: Maximum context length in tokens.
        active: Whether the model is enabled for selection.
        price_input: Latest price per 1M input tokens, or ``None``.
        price_output: Latest price per 1M output tokens, or ``None``.
        first_seen_at: First sync timestamp.
        last_seen_at: Most recent sync timestamp.
        supported_parameters: OpenRouter supported parameters (JSON).
        architecture: OpenRouter architecture info (JSON).
        reasoning: OpenRouter reasoning info (JSON).
        default_parameters: OpenRouter default parameters (JSON).
        top_provider: OpenRouter top-provider info (JSON).
        max_completion_tokens: Maximum completion tokens.
        knowledge_cutoff: Knowledge cutoff string.
        hugging_face_id: HuggingFace model id.
        created: Unix timestamp of model creation on OpenRouter.
        canonical_slug: URL-friendly model slug.
        is_locally_installed: Whether the model is installed locally via Ollama.
        task_type: Model capability classification.
        task_tags: JSON array of task tags.
        status: Resolved core status name, or ``None``.
        status_color_token: Resolved status colour token, or ``None``.
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
    price_input: Decimal | None
    price_output: Decimal | None
    first_seen_at: datetime
    last_seen_at: datetime
    supported_parameters: list[Any] | None
    architecture: dict[str, Any] | None
    reasoning: dict[str, Any] | None
    default_parameters: dict[str, Any] | None
    top_provider: dict[str, Any] | None
    max_completion_tokens: int | None
    knowledge_cutoff: str | None
    hugging_face_id: str | None
    created: int | None
    canonical_slug: str | None
    is_locally_installed: bool
    task_type: str
    task_tags: str | None
    status: str | None = None
    status_color_token: str | None = None


@dataclass(frozen=True, slots=True)
class ModelActiveRecord:
    """Minimal model snapshot used to assert activation.

    Attributes:
        openrouter_id: Composite OpenRouter model id (for error messages).
        active: Whether the model is enabled.
    """

    openrouter_id: str
    active: bool


@dataclass(frozen=True, slots=True)
class ModelIdentityRecord:
    """Minimal model snapshot used to resolve direct-call parameters.

    Attributes:
        id: Primary key.
        openrouter_id: Composite OpenRouter model id.
        native_model_id: Provider-native model id.
        provider_id: FK to the provider row.
    """

    id: int
    openrouter_id: str
    native_model_id: str
    provider_id: int


@dataclass(frozen=True, slots=True)
class PriceSnapshotRecord:
    """Immutable snapshot of one ``shared_price_snapshot`` row.

    Attributes:
        id: Primary key.
        model_id: FK to the model row.
        price_input: Price per 1M input tokens.
        price_output: Price per 1M output tokens.
        source: Data source identifier.
        synced_at: Timestamp when recorded.
    """

    id: int
    model_id: int
    price_input: Decimal
    price_output: Decimal
    source: str
    synced_at: datetime

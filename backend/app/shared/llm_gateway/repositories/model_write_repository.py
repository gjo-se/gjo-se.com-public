"""Write operations for the LLM model catalog (llm_gateway).

Owns the OpenRouter upsert (insert / update of model rows with metadata
mapping). Split out of ``model_repository`` so that module stays cohesive
(LCOM4): the write path shares no collaborator with the read/query path. The
``AsyncSession`` is passed in by the caller (K3).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.model import LLMModel


async def upsert_openrouter_model(
    db: AsyncSession,
    model_entry: dict[str, Any],
    *,
    openrouter_id: str,
    native_model_id: str,
    provider_id: int,
    now: datetime,
) -> int:
    """Insert or update the model row for one OpenRouter entry; returns its id.

    Existing rows only get ``last_seen_at`` refreshed plus the mutable OpenRouter
    metadata (the ``active`` flag is never touched); missing rows are inserted
    with ``active=False``.

    Args:
        db: Active async database session.
        model_entry: One OpenRouter model entry.
        openrouter_id: Composite OpenRouter model id.
        native_model_id: Provider-native model id.
        provider_id: FK to the provider row.
        now: Sync timestamp.

    Returns:
        The primary key of the upserted model row.
    """
    existing = await db.scalar(select(LLMModel).where(LLMModel.openrouter_id == openrouter_id))
    if existing is None:
        return await _insert_openrouter_model(
            db,
            model_entry,
            openrouter_id=openrouter_id,
            native_model_id=native_model_id,
            provider_id=provider_id,
            now=now,
        )

    existing.last_seen_at = now
    if not existing.description:
        existing.description = model_entry.get("description")
    if not existing.context_window:
        existing.context_window = model_entry.get("context_length")
    _apply_openrouter_metadata(existing, model_entry)
    return existing.id


async def _insert_openrouter_model(
    db: AsyncSession,
    model_entry: dict[str, Any],
    *,
    openrouter_id: str,
    native_model_id: str,
    provider_id: int,
    now: datetime,
) -> int:
    """Insert a new, inactive model row for one OpenRouter entry and return its id."""
    top_provider = model_entry.get("top_provider")
    model = LLMModel(
        openrouter_id=openrouter_id,
        native_model_id=native_model_id,
        provider_id=provider_id,
        display_name=model_entry.get("name") or openrouter_id,
        description=model_entry.get("description"),
        context_window=model_entry.get("context_length"),
        active=False,
        first_seen_at=now,
        last_seen_at=now,
        supported_parameters=model_entry.get("supported_parameters"),
        architecture=model_entry.get("architecture"),
        reasoning=model_entry.get("reasoning"),
        default_parameters=model_entry.get("default_parameters"),
        top_provider=top_provider,
        max_completion_tokens=_max_completion_tokens(top_provider),
        knowledge_cutoff=model_entry.get("knowledge_cutoff"),
        hugging_face_id=model_entry.get("hugging_face_id"),
        created=model_entry.get("created"),
        canonical_slug=model_entry.get("canonical_slug"),
    )
    db.add(model)
    await db.flush()  # Assign PK before the price-snapshot FK is set
    return model.id


def _apply_openrouter_metadata(model: LLMModel, model_entry: dict[str, Any]) -> None:
    """Copy the mutable OpenRouter metadata fields onto an existing model row."""
    top_provider = model_entry.get("top_provider")
    model.supported_parameters = model_entry.get("supported_parameters")
    model.architecture = model_entry.get("architecture")
    model.reasoning = model_entry.get("reasoning")
    model.default_parameters = model_entry.get("default_parameters")
    model.top_provider = top_provider
    model.max_completion_tokens = _max_completion_tokens(top_provider)
    model.knowledge_cutoff = model_entry.get("knowledge_cutoff")
    model.hugging_face_id = model_entry.get("hugging_face_id")
    model.created = model_entry.get("created")
    model.canonical_slug = model_entry.get("canonical_slug")


def _max_completion_tokens(top_provider: object) -> Any:
    """Extract ``max_completion_tokens`` from a top-provider dict, else ``None``."""
    if isinstance(top_provider, dict):
        return top_provider.get("max_completion_tokens")
    return None

"""Service layer for syncing the LLM model catalog from OpenRouter.

Owns the data-sync responsibility (fetch + upsert providers, models and price
snapshots) separately from the query/CRUD catalog in :mod:`model_service`.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.provider_contract import ProviderRecord
from app.shared.llm_gateway.repositories import model_repository, model_write_repository
from app.shared.llm_gateway.schemas.model_schemas import LLMSyncResultOut
from app.shared.llm_gateway.services.provider_service import get_or_create_provider

logger = structlog.get_logger(__name__)

_OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"


class LLMModelSyncService:
    """Synchronises the LLM model catalog with the OpenRouter API."""

    async def sync_from_openrouter(self, db: AsyncSession) -> LLMSyncResultOut:
        """Fetch all models from OpenRouter and upsert into the local catalog.

        Rules:
        - New models are inserted with ``active=False``.
        - Existing models have ``last_seen_at`` updated but ``active`` is never changed.
        - Models absent from the response are left untouched (no auto-delete).
        - A new :class:`LLMModelPriceSnapshot` is always appended; existing snapshots
          are never modified.

        Args:
            db: Active async database session.

        Returns:
            :class:`LLMSyncResultOut` with counts of upserted/created rows.
        """
        async with httpx.AsyncClient(timeout=30) as http:
            response = await http.get(_OPENROUTER_MODELS_URL)
        _ = response.raise_for_status()

        models_data: list[dict[str, Any]] = response.json().get("data", [])
        now = datetime.now(UTC)
        # Cache to avoid repeated DB lookups for the same provider within one sync.
        provider_cache: dict[str, ProviderRecord] = {}

        providers_upserted = 0
        models_upserted = 0
        snapshots_created = 0

        for model_entry in models_data:
            provider_delta, model_delta, snapshot_delta = await self._sync_model_entry(
                db, model_entry, now, provider_cache
            )
            providers_upserted += provider_delta
            models_upserted += model_delta
            snapshots_created += snapshot_delta

        await db.commit()
        logger.info(
            "OpenRouter sync complete: %d providers, %d models, %d snapshots",
            providers_upserted,
            models_upserted,
            snapshots_created,
        )
        return LLMSyncResultOut(
            providers_upserted=providers_upserted,
            models_upserted=models_upserted,
            snapshots_created=snapshots_created,
        )

    async def _sync_model_entry(
        self,
        db: AsyncSession,
        model_entry: dict[str, Any],
        now: datetime,
        provider_cache: dict[str, ProviderRecord],
    ) -> tuple[int, int, int]:
        """Upsert one OpenRouter model entry and return (providers, models, snapshots) deltas."""
        openrouter_id: str = model_entry.get("id", "")
        if "/" not in openrouter_id:
            logger.debug("Skipping model with unexpected id format: %s", openrouter_id)
            return 0, 0, 0

        provider_name, native_model_id = openrouter_id.split("/", 1)

        provider_delta = 0
        if provider_name not in provider_cache:
            provider_cache[provider_name] = await get_or_create_provider(db, provider_name)
            provider_delta = 1

        price_input, price_output = _parse_openrouter_price(model_entry)
        model_id = await model_write_repository.upsert_openrouter_model(
            db,
            model_entry,
            openrouter_id=openrouter_id,
            native_model_id=native_model_id,
            provider_id=provider_cache[provider_name].id,
            now=now,
        )
        await model_repository.add_price_snapshot(
            db,
            model_id=model_id,
            price_input=price_input,
            price_output=price_output,
            source="openrouter",
            synced_at=now,
        )
        return provider_delta, 1, 1


def _parse_openrouter_price(model_entry: dict[str, Any]) -> tuple[Decimal, Decimal]:
    """Convert an OpenRouter pricing dict to per-1M-token input/output rates.

    OpenRouter prices are per-token; they are multiplied by 1M for a
    per-1M-token rate. Negative placeholders and unparseable values fall back
    to ``0``.

    Args:
        model_entry: One OpenRouter model entry (``pricing.prompt``/``.completion``).

    Returns:
        ``(price_input, price_output)`` as non-negative ``Decimal`` values.
    """
    pricing = model_entry.get("pricing") or {}
    raw_input = pricing.get("prompt") or "0"
    raw_output = pricing.get("completion") or "0"
    try:
        price_input = max(Decimal("0"), Decimal(str(raw_input)) * Decimal("1000000"))
        price_output = max(Decimal("0"), Decimal(str(raw_output)) * Decimal("1000000"))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0"), Decimal("0")
    return price_input, price_output

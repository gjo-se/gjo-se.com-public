"""Integration tests for LLMModelSyncService – OpenRouter sync (real async DB).

Covers providers/models upsert, ``active=False`` on insert, ``last_seen_at``
refresh without touching ``active`` and the no-auto-delete guarantee. The
OpenRouter HTTP boundary is faked with ``respx`` (no hand-rolled httpx mocks).
"""

from __future__ import annotations

import pytest
import respx
from httpx import Response
from sqlalchemy import select

from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.price_snapshot import LLMModelPriceSnapshot
from app.shared.llm_gateway.models.provider import LLMProvider
from app.shared.llm_gateway.services.model_sync_service import LLMModelSyncService

pytestmark = pytest.mark.integration

_OPENROUTER_URL = "https://openrouter.ai/api/v1/models"

_OPENROUTER_RESPONSE = {
    "data": [
        {
            "id": "openai/gpt-4o-mini",
            "name": "OpenAI: GPT-4o-mini",
            "description": "A small fast model",
            "context_length": 128000,
            "pricing": {"prompt": "0.00000015", "completion": "0.00000060"},
        },
        {
            "id": "anthropic/claude-3-haiku",
            "name": "Anthropic: Claude 3 Haiku",
            "description": "Fast compact model",
            "context_length": 200000,
            "pricing": {"prompt": "0.00000025", "completion": "0.00000125"},
        },
    ]
}


async def _sync_once(db_session, data: dict) -> None:
    """Run one ``sync_from_openrouter`` against a faked OpenRouter endpoint."""
    with respx.mock:
        respx.get(_OPENROUTER_URL).mock(return_value=Response(200, json=data))
        await LLMModelSyncService().sync_from_openrouter(db_session)


@pytest.mark.asyncio
async def test_sync_creates_providers_and_models_with_snapshot(db_session) -> None:
    """sync_from_openrouter creates providers, models (active=False), and snapshots."""
    with respx.mock:
        respx.get(_OPENROUTER_URL).mock(return_value=Response(200, json=_OPENROUTER_RESPONSE))

        result = await LLMModelSyncService().sync_from_openrouter(db_session)

    assert result.providers_upserted == 2
    assert result.models_upserted == 2
    assert result.snapshots_created == 2

    providers = list((await db_session.execute(select(LLMProvider).order_by(LLMProvider.name))).scalars())
    assert len(providers) == 2
    provider_names = {p.name for p in providers}
    assert "openai" in provider_names
    assert "anthropic" in provider_names

    models = list((await db_session.execute(select(LLMModel).order_by(LLMModel.openrouter_id))).scalars())
    assert len(models) == 2
    for model in models:
        assert model.active is False
        assert model.provider_id is not None

    snapshots = list((await db_session.execute(select(LLMModelPriceSnapshot))).scalars())
    assert len(snapshots) == 2


@pytest.mark.asyncio
async def test_sync_updates_last_seen_at_for_known_model(db_session) -> None:
    """sync_from_openrouter updates last_seen_at but never the active flag."""
    await _sync_once(db_session, _OPENROUTER_RESPONSE)

    model = await db_session.scalar(select(LLMModel).where(LLMModel.openrouter_id == "openai/gpt-4o-mini"))
    assert model is not None
    model.active = True
    await db_session.commit()

    await _sync_once(db_session, _OPENROUTER_RESPONSE)

    model = await db_session.scalar(select(LLMModel).where(LLMModel.openrouter_id == "openai/gpt-4o-mini"))
    assert model is not None
    assert model.last_seen_at is not None
    assert model.active is True


@pytest.mark.asyncio
async def test_sync_absent_model_not_deleted(db_session) -> None:
    """Models absent from the OpenRouter response are not auto-deleted."""
    await _sync_once(db_session, _OPENROUTER_RESPONSE)
    partial = {"data": [_OPENROUTER_RESPONSE["data"][0]]}
    await _sync_once(db_session, partial)

    models = list((await db_session.execute(select(LLMModel))).scalars())
    assert len(models) == 2

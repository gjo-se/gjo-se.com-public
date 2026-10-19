"""Shared fixtures for llm_gateway integration tests (real Postgres session)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.provider import LLMProvider


@pytest.fixture()
async def llm_provider(db_session: AsyncSession) -> LLMProvider:
    """Create and persist a test LLM provider."""
    provider = LLMProvider(name="openai", display_name="OpenAI")
    db_session.add(provider)
    await db_session.flush()
    return provider


@pytest.fixture()
async def llm_model(db_session: AsyncSession, llm_provider: LLMProvider) -> LLMModel:
    """Create and persist an active test LLM model."""
    now = datetime.now(UTC)
    model = LLMModel(
        openrouter_id="openai/gpt-4o-mini",
        native_model_id="gpt-4o-mini",
        provider_id=llm_provider.id,
        display_name="GPT-4o mini",
        active=True,
        first_seen_at=now,
        last_seen_at=now,
    )
    db_session.add(model)
    await db_session.flush()
    return model

"""Integration tests for the fallback-model resolution service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.task_model_config import TaskModelConfig
from app.shared.llm_gateway.services.fallback_service import FallbackService


@pytest.mark.integration
async def test_resolve_fallback_returns_none_without_a_fallback_config(db_session: AsyncSession) -> None:
    """A task without a fallback row resolves to None."""
    assert await FallbackService().resolve_fallback(db_session, "description-merge") is None


@pytest.mark.integration
async def test_resolve_fallback_returns_the_configured_model(
    db_session: AsyncSession,
    llm_model: LLMModel,
) -> None:
    """A task with a fallback row resolves to its model and credential ids."""
    config = TaskModelConfig(task="description-merge", model_id=llm_model.id, is_fallback=True)
    db_session.add(config)
    await db_session.commit()

    result = await FallbackService().resolve_fallback(db_session, "description-merge")

    assert result == {"model_id": llm_model.id, "credential_id": None}

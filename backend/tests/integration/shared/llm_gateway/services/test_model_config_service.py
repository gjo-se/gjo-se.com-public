"""Integration tests for the unified task-model-config service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.schemas.model_config_schemas import ModelConfigCreate, ModelConfigUpdate
from app.shared.llm_gateway.services.model_config_service import ModelConfigService


@pytest.mark.integration
async def test_create_rejects_an_unknown_task(db_session: AsyncSession, llm_model: LLMModel) -> None:
    """Creating a config for a task outside the registry raises ValueError."""
    service = ModelConfigService(db_session)

    with pytest.raises(ValueError, match="Unbekannter Task"):
        await service.create("not-a-task", ModelConfigCreate(model_id=llm_model.id, is_eval=False))


@pytest.mark.integration
async def test_create_persists_a_production_config(db_session: AsyncSession, llm_model: LLMModel) -> None:
    """A production config is persisted and resolvable via get_production."""
    service = ModelConfigService(db_session)

    config = await service.create(
        "description-merge",
        ModelConfigCreate(model_id=llm_model.id, is_eval=False, is_production=True),
    )

    assert config.is_production is True
    assert config.is_eval is True
    fetched = await service.get_production("description-merge")
    assert fetched is not None
    assert fetched.id == config.id


@pytest.mark.integration
async def test_update_changes_only_provided_fields(db_session: AsyncSession, llm_model: LLMModel) -> None:
    """A partial update applies the new hyperparameters without touching the model."""
    service = ModelConfigService(db_session)
    config = await service.create("description-merge", ModelConfigCreate(model_id=llm_model.id, is_eval=False))

    updated = await service.update(config.id, ModelConfigUpdate(hyperparameters={"temperature": 0.2}))

    assert updated.hyperparameters == {"temperature": 0.2}
    assert updated.model_id == llm_model.id


@pytest.mark.integration
async def test_delete_removes_the_config(db_session: AsyncSession, llm_model: LLMModel) -> None:
    """Deleting a config removes it from the task listing."""
    service = ModelConfigService(db_session)
    config = await service.create("description-merge", ModelConfigCreate(model_id=llm_model.id, is_eval=False))

    await service.delete(config.id)

    assert await service.list_by_task("description-merge") == []


@pytest.mark.integration
async def test_delete_unknown_config_raises(db_session: AsyncSession) -> None:
    """Deleting an unknown config id raises ValueError."""
    service = ModelConfigService(db_session)

    with pytest.raises(ValueError, match="nicht gefunden"):
        await service.delete(999_999)

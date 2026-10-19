"""Unit tests for the task-model-config model and its delegation properties."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.shared.llm_gateway.models.task_model_config import TaskModelConfig


@pytest.mark.unit
def test_model_display_name_is_none_without_a_model() -> None:
    """The display name degrades to None when no model is attached."""
    assert TaskModelConfig().model_display_name is None


@pytest.mark.unit
def test_model_display_name_delegates_to_model_display_name() -> None:
    """The display name surfaces the attached model's display name."""
    config = TaskModelConfig()
    config.model = SimpleNamespace(display_name="GPT-4o")

    assert config.model_display_name == "GPT-4o"


@pytest.mark.unit
def test_provider_name_is_none_when_model_has_no_provider() -> None:
    """The provider name is None when the model has no provider attached."""
    config = TaskModelConfig()
    config.model = SimpleNamespace(provider=None)

    assert config.provider_name is None


@pytest.mark.unit
def test_provider_name_delegates_to_provider_display_name() -> None:
    """The provider name surfaces the model provider's display name."""
    config = TaskModelConfig()
    config.model = SimpleNamespace(provider=SimpleNamespace(display_name="OpenAI"))

    assert config.provider_name == "OpenAI"


@pytest.mark.unit
def test_credential_label_delegates_to_credential_label() -> None:
    """The credential label surfaces the attached credential's label."""
    config = TaskModelConfig()
    config.credential = SimpleNamespace(label="prod-key")

    assert config.credential_label == "prod-key"


@pytest.mark.unit
def test_production_and_fallback_are_mutually_exclusive_by_constraint() -> None:
    """A check constraint forbids a row from being both production and fallback."""
    constraint_names = {c.name for c in TaskModelConfig.__table__.constraints if c.name is not None}
    assert "ck_production_xor_fallback" in constraint_names
    assert "ck_judge_xor_production" in constraint_names

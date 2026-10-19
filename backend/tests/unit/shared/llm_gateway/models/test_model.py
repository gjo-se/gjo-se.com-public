"""Unit tests for app/core/llm/models/model.py – LLMModel entity."""

import pytest

from app.shared.llm_gateway.models.model import LLMModel


class TestLLMModel:
    """Tests for LLMModel ORM model."""

    @pytest.mark.unit
    def test_llm_model_has_required_attributes(self) -> None:
        """Test: LLMModel has expected attributes."""
        model = LLMModel(
            openrouter_id="test/model",
            native_model_id="test_model",
            provider_id=1,
            display_name="Test Model",
        )

        assert hasattr(model, "id")
        assert hasattr(model, "openrouter_id")
        assert hasattr(model, "native_model_id")
        assert hasattr(model, "provider_id")
        assert hasattr(model, "display_name")

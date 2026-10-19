"""Unit tests for app/core/llm/models/provider.py – LLMProvider entity."""

import pytest

from app.shared.llm_gateway.models.provider import LLMProvider


class TestLLMProviderModel:
    """Tests for LLMProvider ORM model."""

    @pytest.mark.unit
    def test_llm_provider_has_required_attributes(self) -> None:
        """Test: LLMProvider has expected attributes."""
        provider = LLMProvider(name="test_provider", display_name="Test Provider")

        assert hasattr(provider, "id")
        assert hasattr(provider, "name")
        assert hasattr(provider, "display_name")
        assert hasattr(provider, "created_at")

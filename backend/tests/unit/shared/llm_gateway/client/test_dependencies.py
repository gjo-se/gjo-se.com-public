"""Unit tests for the low-level LLM client composition-root provider."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.client.client import LLMClient
from app.shared.llm_gateway.client.dependencies import get_llm_client_factory


@pytest.mark.unit
def test_provider_returns_the_llm_client_class_as_factory() -> None:
    """The composition root wires the factory to the LLMClient class itself."""
    assert get_llm_client_factory() is LLMClient


@pytest.mark.unit
def test_provider_factory_builds_a_client_for_a_model_name() -> None:
    """Calling the provided factory yields a configured LLMClient."""
    factory = get_llm_client_factory()

    client = factory("gpt-4o-mini")

    assert isinstance(client, LLMClient)

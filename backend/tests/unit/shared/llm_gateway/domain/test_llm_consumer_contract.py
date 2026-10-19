"""Unit tests for the LLM client factory consumer mixin."""

from __future__ import annotations

from typing import Any

import pytest

from app.shared.llm_gateway.client.client import LLMClient
from app.shared.llm_gateway.domain.llm_consumer_contract import LLMClientFactoryConsumer


class _FactoryConsumer(LLMClientFactoryConsumer):
    """Concrete mixin consumer exposing the injected factory for assertions."""

    def build(self, task_key: str) -> LLMClient:
        """Resolve a client for *task_key* via the injected factory."""
        return self._llm_client_factory(task_key)


@pytest.mark.unit
def test_mixin_resolves_a_client_for_the_given_task_key() -> None:
    """The mixin forwards exactly the requested task key to the factory."""
    seen: list[str] = []

    def factory(task_key: str) -> LLMClient:
        seen.append(task_key)
        return LLMClient(model="gpt-4o")

    consumer = _FactoryConsumer(factory)

    consumer.build("description-merge")

    assert seen == ["description-merge"]


@pytest.mark.unit
def test_each_consumer_uses_only_its_own_injected_factory() -> None:
    """Two consumers keep their factories isolated from one another."""
    seen_first: list[str] = []
    seen_second: list[str] = []

    def first_factory(task_key: str) -> Any:
        seen_first.append(task_key)
        return object()

    def second_factory(task_key: str) -> Any:
        seen_second.append(task_key)
        return object()

    _FactoryConsumer(first_factory).build("a")
    _FactoryConsumer(second_factory).build("b")

    assert seen_first == ["a"]
    assert seen_second == ["b"]

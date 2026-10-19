"""Unit tests for the shared embedding consumer mixin."""

from __future__ import annotations

import pytest

from app.shared.embedding.domain.embedding_consumer_contract import EmbeddingClientConsumer

pytestmark = pytest.mark.unit


class _Consumer(EmbeddingClientConsumer[str]):
    """Concrete consumer exposing the injected client via a public accessor."""

    def client(self) -> str:
        """Return the injected embedding client (observable behaviour)."""
        return self._embedding_service


def test_embedding_consumer_stores_injected_client() -> None:
    """The mixin makes the injected embedding client available to the subclass."""
    consumer = _Consumer("embedding-client")

    assert consumer.client() == "embedding-client"

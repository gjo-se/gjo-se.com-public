"""Unit tests for the shared embedding client composition-root provider."""

from __future__ import annotations

import pytest

from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient

pytestmark = pytest.mark.unit


def test_get_embedding_client_returns_embedding_client_instance() -> None:
    """The provider builds a concrete EmbeddingClient."""
    assert isinstance(get_embedding_client(), EmbeddingClient)


def test_get_embedding_client_returns_fresh_instance_per_call() -> None:
    """The provider is stateless and returns a new client each call."""
    assert get_embedding_client() is not get_embedding_client()

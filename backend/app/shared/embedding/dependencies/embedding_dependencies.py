"""Composition-root providers for the shared embedding client."""

from __future__ import annotations

from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient


def get_embedding_client() -> EmbeddingClient:
    """Provide a fresh :class:`EmbeddingClient`.

    Wiring point for the shared embedding client. Consumers receive the client
    as a parameter (constructor / ``Depends`` / activity wiring) instead of
    instantiating it directly.
    """
    return EmbeddingClient()

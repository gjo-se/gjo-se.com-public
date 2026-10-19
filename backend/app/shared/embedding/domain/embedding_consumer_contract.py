"""Reusable mixin for services that consume an injected embedding client.

Every embedding-backed service stores its injected client under
``_embedding_service``. That one-line ``__init__`` was duplicated across the
catalog, skill-extraction, dedup and call-log-promote services; this mixin is
the single source of truth for it. Subclasses that carry additional state call
``super().__init__(embedding_service)`` and then set their own attributes.
"""

from __future__ import annotations


class EmbeddingClientConsumer[T]:
    """Mixin storing an injected embedding client as ``_embedding_service``.

    Attributes:
        _embedding_service: The injected embedding client/service (or ``None``
            for optional consumers – see :class:`FreelancermapMapperClient`).
    """

    _embedding_service: T

    def __init__(self, embedding_service: T) -> None:
        """Store the injected embedding client.

        Args:
            embedding_service: The embedding client/service to consume.
        """
        self._embedding_service = embedding_service

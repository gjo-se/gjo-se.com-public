"""Generic OpenRouter embedding client (shared, technical).

Cross-context embedding access (``embed_text`` / ``embed_many``). Domain-specific
text construction and persistence stay in the owning bounded context, e.g.
``app.fbf.services.embedding_service``.
"""

from __future__ import annotations

import os
from typing import cast

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.credential_store.dependencies.credential_store_dependencies import (
    get_admin_credential_service,
)
from app.shared.embedding.exceptions import EmbeddingServiceError

logger = structlog.get_logger(__name__)

# Expected embedding dimension for openai/text-embedding-3-small
_EXPECTED_DIMENSION: int = 1536

_HTTP_OK: int = httpx.codes.OK


class EmbeddingClient:
    """OpenRouter embedding API client. Uses ``openrouter:1`` credentials.

    The embedding model is configured via the ``EMBEDDING_MODEL`` env variable
    (default: ``openai/text-embedding-3-small``).
    """

    OPENROUTER_EMBEDDINGS_URL: str = "https://openrouter.ai/api/v1/embeddings"
    ADMIN_SERVICE_NAME: str = "openrouter:1"
    _BATCH_TIMEOUT: int = 90

    def __init__(self, model: str | None = None) -> None:
        self.model: str = model or os.environ.get("EMBEDDING_MODEL", "openai/text-embedding-3-small")
        self._call_count: int = 0
        self._total_tokens: int = 0

    def get_stats(self) -> dict[str, int | float]:
        """Returns embedding usage statistics for the current run.

        Returns:
            Dict with ``calls``, ``total_tokens``, ``estimated_cost`` (USD).
            Cost is calculated at $0.02 per 1M tokens (text-embedding-3-small).
        """
        cost = self._total_tokens * 0.00000002 if self._total_tokens > 0 else 0.0
        return {
            "calls": self._call_count,
            "total_tokens": self._total_tokens,
            "estimated_cost": round(cost, 8),
        }

    async def embed_text(self, text: str, db: AsyncSession) -> list[float]:
        """Single embedding for a raw text string via OpenRouter.

        Args:
            text: Text to embed.
            db: Core DB session for the ``openrouter:1`` credential lookup.

        Returns:
            A 1536-dimensional float vector.
        """
        vectors = await self.embed_many([text], db)
        return vectors[0]

    async def embed_many(self, texts: list[str], db: AsyncSession) -> list[list[float]]:
        """Batch-embed multiple texts in a single OpenRouter API call.

        Sends the texts as an array in ``input`` so the provider returns one
        embedding vector per text.  This avoids the per-text latency overhead
        and reduces total HTTP calls by the batch factor.

        Args:
            texts: Non-empty list of embedding texts.
            db: Core DB session for ``openrouter:1`` credential lookup.

        Returns:
            List of 1536-dimensional float vectors, one per input text.
        """
        if not texts:
            return []

        self._call_count += 1

        credentials = await get_admin_credential_service().get_credentials(db, self.ADMIN_SERVICE_NAME)
        api_key = credentials.get("api_key")
        if not api_key:
            raise EmbeddingServiceError("No API key configured for OpenRouter")

        async with httpx.AsyncClient(timeout=self._BATCH_TIMEOUT) as client:
            try:
                response = await client.post(
                    self.OPENROUTER_EMBEDDINGS_URL,
                    json={"model": self.model, "input": texts},
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )
            except httpx.RequestError as exc:
                logger.exception("EmbeddingClient: HTTP request failed for model=%s", self.model)
                raise EmbeddingServiceError(f"HTTP request to OpenRouter failed: {exc}") from exc

        if response.status_code != _HTTP_OK:
            logger.error(
                "EmbeddingClient: OpenRouter returned HTTP %d for model=%s: %s",
                response.status_code,
                self.model,
                response.text,
            )
            raise EmbeddingServiceError(f"OpenRouter API returned HTTP {response.status_code}: {response.text}")

        data = response.json()
        raw_embeddings: list[dict[str, object]] = data.get("data", [])

        # Track token usage from response
        usage: dict[str, object] | None = data.get("usage")
        if usage is not None:
            tokens = cast("int", usage.get("total_tokens", 0))
            self._total_tokens += tokens

        if not raw_embeddings:
            logger.error("EmbeddingClient: OpenRouter returned empty embedding response")
            raise EmbeddingServiceError("OpenRouter returned empty embedding response")

        if len(raw_embeddings) != len(texts):
            logger.warning(
                "EmbeddingClient: expected %d vectors, got %d",
                len(texts),
                len(raw_embeddings),
            )

        vectors: list[list[float]] = []
        for item in raw_embeddings:
            vec = cast("list[float]", item["embedding"])
            if len(vec) != _EXPECTED_DIMENSION:
                logger.warning(
                    "EmbeddingClient: unexpected dimension %d (expected %d)",
                    len(vec),
                    _EXPECTED_DIMENSION,
                )
            vectors.append(vec)

        logger.debug(
            "EmbeddingClient: batch-embedded %d texts → %d vectors",
            len(texts),
            len(vectors),
        )
        return vectors

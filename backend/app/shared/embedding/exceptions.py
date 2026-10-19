"""Embedding client exceptions (shared technical layer)."""


class EmbeddingServiceError(Exception):
    """Error during embedding API call (HTTP errors, empty response, etc.)."""

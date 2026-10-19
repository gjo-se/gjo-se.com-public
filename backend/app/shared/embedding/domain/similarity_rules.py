"""Cosine-similarity helper shared across embedding consumers.

Extracted from six byte-identical copies in ``fbf``, ``viscera`` and
``shared`` services/activities. Live in ``app.shared.embedding`` so every
context can import it without a domain dependency.
"""

from __future__ import annotations


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Computes the cosine similarity between two equal-length vectors.

    Assumes pre-normalised embeddings (OpenAI default). For non-normalised
    vectors the result is still mathematically correct but ranges may differ.

    Args:
        vec_a: First embedding vector.
        vec_b: Second embedding vector, same length as ``vec_a``.

    Returns:
        Cosine similarity in ``[-1.0, 1.0]``, or ``0.0`` if either norm is zero.
    """
    dot = sum(a * b for a, b in zip(vec_a, vec_b, strict=True))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

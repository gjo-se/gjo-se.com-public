"""Unit tests for the shared cosine-similarity helper."""

from __future__ import annotations

import pytest

from app.shared.embedding.domain.similarity_rules import cosine_similarity

pytestmark = pytest.mark.unit


def test_cosine_similarity_identical_vectors_is_one() -> None:
    """Identical non-zero vectors have cosine similarity 1.0."""
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors_is_zero() -> None:
    """Orthogonal vectors have cosine similarity 0.0."""
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)


def test_cosine_similarity_opposite_vectors_is_minus_one() -> None:
    """Opposite vectors have cosine similarity -1.0."""
    assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(-1.0)


def test_cosine_similarity_zero_vector_returns_zero() -> None:
    """A zero-norm vector yields 0.0 instead of dividing by zero."""
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_cosine_similarity_mismatched_lengths_raises() -> None:
    """Vectors of different lengths are rejected by the strict zip."""
    with pytest.raises(ValueError):
        cosine_similarity([1.0, 2.0], [1.0])

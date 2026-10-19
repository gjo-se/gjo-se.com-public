"""Unit tests for the stability analyzer statistics."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.services.stability_analyzer_service import (
    StabilityAnalyzer,
    StabilityMetrics,
    StabilityResult,
)


class _FakeEmbedder:
    """Embedding double returning fixed vectors for the cosine-similarity path."""

    def __init__(self, vectors: list[list[float]]) -> None:
        import torch

        self._vectors = torch.tensor(vectors, dtype=torch.float32)

    def encode(self, texts: list[str], *, convert_to_tensor: bool = True) -> object:
        """Return the pre-built vectors, ignoring the input texts."""
        del texts, convert_to_tensor
        return self._vectors


@pytest.mark.unit
def test_coefficient_of_variation_is_zero_for_a_single_sample() -> None:
    """A single value has no spread and therefore a CV of zero."""
    assert StabilityAnalyzer.coefficient_of_variation([100.0]) == 0.0


@pytest.mark.unit
def test_coefficient_of_variation_matches_the_sample_standard_deviation() -> None:
    """CV is sample standard deviation divided by the mean."""
    # mean = 20, sample std = 10 → CV = 0.5
    assert StabilityAnalyzer.coefficient_of_variation([10.0, 20.0, 30.0]) == pytest.approx(0.5)


@pytest.mark.unit
def test_percentile_interpolates_between_neighbours() -> None:
    """The 50th percentile of [0, 10] interpolates to 5.0."""
    assert StabilityAnalyzer.percentile([0.0, 10.0], 50) == pytest.approx(5.0)


@pytest.mark.unit
def test_percentile_of_an_empty_list_is_zero() -> None:
    """An empty sample yields a zero percentile instead of raising."""
    assert StabilityAnalyzer.percentile([], 95) == 0.0


@pytest.mark.unit
def test_analyze_stability_of_no_results_is_all_zero() -> None:
    """Without any sample the metrics are zeroed with sample_size 0."""
    metrics = StabilityAnalyzer().analyze_stability([])

    assert metrics.sample_size == 0
    assert metrics.success_rate == 0.0
    assert metrics.latency_p50_ms == 0.0


@pytest.mark.unit
def test_analyze_stability_reports_success_rate_and_latency() -> None:
    """A half-failed sample reports 0.5 success and the surviving latency."""
    results = [
        StabilityResult(success=True, duration_ms=100, output_text="a", token_count=5),
        StabilityResult(success=False, duration_ms=0, output_text="", token_count=0),
    ]

    metrics = StabilityAnalyzer().analyze_stability(results)

    assert metrics.sample_size == 2
    assert metrics.success_rate == pytest.approx(0.5)
    assert metrics.latency_p50_ms == pytest.approx(100.0)


@pytest.mark.unit
def test_coefficient_of_variation_empty_and_zero_mean_are_zero() -> None:
    """CV is 0.0 for an empty list and for an all-zero sample."""
    assert StabilityAnalyzer.coefficient_of_variation([]) == 0.0
    assert StabilityAnalyzer.coefficient_of_variation([0.0, 0.0]) == 0.0


@pytest.mark.unit
def test_percentile_bounds_and_exact_index() -> None:
    """The 0th/100th percentiles hit the bounds and an integer k skips interpolation."""
    values = [10.0, 20.0, 30.0]

    assert StabilityAnalyzer.percentile(values, 0) == pytest.approx(10.0)
    assert StabilityAnalyzer.percentile(values, 100) == pytest.approx(30.0)
    assert StabilityAnalyzer.percentile(values, 50) == pytest.approx(20.0)


@pytest.mark.unit
def test_cosine_similarity_short_input_returns_one() -> None:
    """Fewer than two texts short-circuit to 1.0 without loading a model."""
    assert StabilityAnalyzer().cosine_similarity([]) == 1.0
    assert StabilityAnalyzer().cosine_similarity(["only"]) == 1.0


@pytest.mark.unit
def test_analyze_stability_filters_nonpositive_values_and_computes_p95() -> None:
    """Zero durations/tokens are dropped; p95 and CVs use the remaining sample."""
    results = [
        StabilityResult(success=True, duration_ms=0, output_text="", token_count=0),
        StabilityResult(success=True, duration_ms=100, output_text="", token_count=10),
        StabilityResult(success=True, duration_ms=300, output_text="", token_count=20),
    ]

    metrics = StabilityAnalyzer().analyze_stability(results)

    assert metrics.sample_size == 3
    assert metrics.success_rate == pytest.approx(1.0)
    assert metrics.latency_p50_ms == pytest.approx(200.0)
    assert metrics.latency_p95_ms == pytest.approx(290.0)
    assert metrics.token_cv > 0.0


@pytest.mark.unit
def test_analyze_stability_without_output_text_gives_full_similarity() -> None:
    """Successful calls without output text yield a similarity of 1.0."""
    results = [
        StabilityResult(success=True, duration_ms=100, output_text="", token_count=0),
        StabilityResult(success=True, duration_ms=100, output_text="", token_count=0),
    ]

    metrics = StabilityAnalyzer().analyze_stability(results)

    assert metrics.output_similarity == 1.0


@pytest.mark.unit
def test_analyze_stability_without_results_zeroes_every_metric() -> None:
    """The empty sample zeroes every field – not only the asserted subset."""
    assert StabilityAnalyzer().analyze_stability([]) == StabilityMetrics(
        success_rate=0.0,
        output_similarity=0.0,
        latency_cv=0.0,
        token_cv=0.0,
        latency_p50_ms=0.0,
        latency_p95_ms=0.0,
        sample_size=0,
    )


@pytest.mark.unit
def test_analyze_stability_ignores_zero_token_and_duration_samples() -> None:
    """Zero durations/tokens are excluded from the statistics (strictly positive)."""
    results = [
        StabilityResult(success=True, duration_ms=0, output_text="", token_count=0),
        StabilityResult(success=True, duration_ms=100, output_text="", token_count=10),
        StabilityResult(success=True, duration_ms=300, output_text="", token_count=20),
    ]

    metrics = StabilityAnalyzer().analyze_stability(results)

    # tokens = [10, 20] → mean 15, sample variance 50, std 7.0711 → CV 0.471405
    assert metrics.token_cv == pytest.approx(0.4714, abs=1e-4)
    # durations = [100, 300] → mean 200, sample variance 20000, std 141.4214 → CV 0.707107
    assert metrics.latency_cv == pytest.approx(0.7071, abs=1e-4)


@pytest.mark.unit
def test_cosine_similarity_averages_pairwise_embedding_scores(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The mean is taken over unordered pairs (i < j) of the embedding vectors."""
    monkeypatch.setattr(
        StabilityAnalyzer,
        "_embedding_model",
        _FakeEmbedder([[1.0, 0.0], [0.0, 1.0], [1.0, 0.0]]),
    )

    # pairs: (0,1)=0.0, (0,2)=1.0, (1,2)=0.0 → mean 1/3
    result = StabilityAnalyzer().cosine_similarity(["a", "b", "c"])

    assert result == pytest.approx(1.0 / 3.0, abs=1e-6)


@pytest.mark.unit
def test_cosine_similarity_propagates_embedding_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """A failing encoder degrades to 0.0 instead of raising."""

    class _BoomSentenceTransformer:
        """Encoder double whose ``encode`` raises (external model boundary)."""

        def __init__(self, _model_name: str) -> None:
            return None

        def encode(self, _texts: list[str], *, convert_to_tensor: bool = True) -> object:
            raise RuntimeError("encoder down")

    monkeypatch.setattr("sentence_transformers.SentenceTransformer", _BoomSentenceTransformer)

    assert StabilityAnalyzer().cosine_similarity(["a", "b"]) == 0.0

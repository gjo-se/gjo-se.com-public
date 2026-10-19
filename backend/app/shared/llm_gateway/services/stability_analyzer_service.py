"""Stability analyser – statistical metrics for LLM output evaluation.

Provides cosine-similarity (embedding-based), coefficient of variation,
percentile calculation, and a composite stability analysis used by
Gate 1d of the evaluation suite.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class StabilityResult:
    """Single LLM call result for stability analysis.

    Attributes:
        success: Whether the call succeeded.
        duration_ms: Wall-clock duration in milliseconds.
        output_text: The model's text response (empty on failure).
        token_count: Token count if available, or ``0``.
    """

    success: bool
    duration_ms: int
    output_text: str
    token_count: int


@dataclass(frozen=True)
class StabilityMetrics:
    """Aggregated stability metrics from N parallel calls.

    Attributes:
        success_rate: Fraction of successful calls (0.0–1.0).
        output_similarity: Average pairwise cosine similarity (0.0–1.0).
        latency_cv: Coefficient of variation of call durations.
        token_cv: Coefficient of variation of token counts.
        latency_p50_ms: Median call duration.
        latency_p95_ms: 95th percentile call duration.
        sample_size: Number of calls analysed.
    """

    success_rate: float
    output_similarity: float
    latency_cv: float
    token_cv: float
    latency_p50_ms: float
    latency_p95_ms: float
    sample_size: int


_MIN_SAMPLE_SIZE = 2
"""Minimum number of values required for meaningful statistics."""


class StabilityAnalyzer:
    """Stateless statistical helper for LLM stability evaluation.

    Usage::

        from app.shared.llm_gateway.services.stability_analyzer_service import stability_analyzer

        metrics = stability_analyzer.analyze_stability(results)
    """

    _embedding_model: SentenceTransformer | None = None

    @staticmethod
    def coefficient_of_variation(values: list[float]) -> float:
        """Return CV = standard deviation / mean.

        Args:
            values: Non-empty list of numeric values.

        Returns:
            CV as a float. Returns 0.0 for single-element lists or
            when the mean is 0.
        """
        if len(values) < _MIN_SAMPLE_SIZE:
            return 0.0
        mean = sum(values) / len(values)
        if mean == 0:
            return 0.0
        variance = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
        return math.sqrt(variance) / mean

    @staticmethod
    def percentile(values: list[float], p: float) -> float:
        """Compute the *p*-th percentile using linear interpolation.

        Args:
            values: List of numeric values (will be sorted internally).
            p: Percentile between 0 and 100.

        Returns:
            The computed percentile value.
        """
        if not values:
            return 0.0
        sorted_vals = sorted(values)
        k = (p / 100) * (len(sorted_vals) - 1)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return sorted_vals[int(k)]
        d0 = sorted_vals[f] * (c - k)
        d1 = sorted_vals[c] * (k - f)
        return d0 + d1

    def cosine_similarity(self, texts: list[str]) -> float:
        """Compute average pairwise cosine similarity via sentence embeddings.

        Loads the ``all-MiniLM-L6-v2`` model lazily on first call.
        Returns 1.0 if fewer than 2 texts are provided.

        Args:
            texts: List of output strings to compare.

        Returns:
            Average pairwise cosine similarity (0.0–1.0).
        """
        if len(texts) < _MIN_SAMPLE_SIZE:
            return 1.0

        if self._embedding_model is None:
            try:
                from sentence_transformers import SentenceTransformer

                self._embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
                logger.info("stability_analyzer: embedding model loaded")
            except Exception:
                logger.exception(
                    "stability_analyzer: sentence-transformers not available – returning 1.0 for cosine_similarity",
                )
                return 1.0

        try:
            embeddings = self._embedding_model.encode(texts, convert_to_tensor=True)
            # Compute pairwise cosine similarities.
            from torch import nn

            cos = nn.CosineSimilarity(dim=1)
            sims: list[float] = []
            n = len(embeddings)
            for i in range(n):
                for j in range(i + 1, n):
                    sim = cos(
                        embeddings[i].unsqueeze(0),
                        embeddings[j].unsqueeze(0),
                    )
                    sims.append(float(sim))
            return sum(sims) / len(sims) if sims else 1.0
        except Exception:
            logger.exception("stability_analyzer: cosine_similarity failed")
            return 0.0

    def analyze_stability(
        self,
        results: list[StabilityResult],
    ) -> StabilityMetrics:
        """Compute aggregate stability metrics from N call results.

        Args:
            results: List of :class:`StabilityResult` from parallel calls.

        Returns:
            :class:`StabilityMetrics` with success rate, similarity,
            latency/token CV, and latency percentiles.
        """
        n = len(results)
        if n == 0:
            return StabilityMetrics(
                success_rate=0.0,
                output_similarity=0.0,
                latency_cv=0.0,
                token_cv=0.0,
                latency_p50_ms=0.0,
                latency_p95_ms=0.0,
                sample_size=0,
            )

        successes = [r for r in results if r.success]
        success_rate = len(successes) / n

        # Output similarity – only on successful calls with non-empty output.
        output_texts = [r.output_text for r in successes if r.output_text]
        output_similarity = self.cosine_similarity(output_texts) if output_texts else 1.0

        # Latency metrics.
        durations = [float(r.duration_ms) for r in results if r.duration_ms > 0]
        latency_cv = self.coefficient_of_variation(durations) if durations else 0.0
        latency_p50_ms = self.percentile(durations, 50) if durations else 0.0
        latency_p95_ms = self.percentile(durations, 95) if durations else 0.0

        # Token metrics.
        tokens = [float(r.token_count) for r in successes if r.token_count > 0]
        token_cv = self.coefficient_of_variation(tokens) if tokens else 0.0

        return StabilityMetrics(
            success_rate=round(success_rate, 4),
            output_similarity=round(output_similarity, 4),
            latency_cv=round(latency_cv, 4),
            token_cv=round(token_cv, 4),
            latency_p50_ms=round(latency_p50_ms, 1),
            latency_p95_ms=round(latency_p95_ms, 1),
            sample_size=n,
        )

"""Unit tests for the frozen application-score rubric canon and aggregator.

Covers ``application_score_rubric_rules``: the weight canon (fixed denominator
100), the weighted aggregation with its data-gap semantics (``value=None``
lowers the assessed weight without renormalising) and the verdict boundaries
(``ready``/``borderline``/``weak``, ``None`` below the minimum assessed weight).
"""

from __future__ import annotations

import pytest

from app.application.domain import application_score_rubric_rules as rubric

pytestmark = pytest.mark.unit


def _score_all(value: float) -> list[rubric.CriterionScore]:
    """Build one assessed score per canon criterion at the given value."""
    return [
        rubric.CriterionScore(key=criterion.key, group=criterion.group, value=value, weight=criterion.weight)
        for criterion in rubric.SCORE_CRITERIA
    ]


def test_canon_weights_sum_to_fixed_denominator() -> None:
    """The fixed canon weights sum to the rubric denominator of 100."""
    assert sum(criterion.weight for criterion in rubric.SCORE_CRITERIA) == rubric.RUBRIC_TOTAL_WEIGHT


def test_canon_has_no_duplicate_criterion_keys() -> None:
    """Every criterion key exists exactly once in the canon."""
    keys = [criterion.key for criterion in rubric.SCORE_CRITERIA]

    assert len(keys) == len(set(keys))


def test_canonical_content_and_hard_keys_partition_the_canon() -> None:
    """Content and hard keys together cover the canon without overlap."""
    combined = set(rubric.CONTENT_CRITERIA_KEYS) | set(rubric.HARD_CRITERIA_KEYS)

    assert combined == set(rubric.CANONICAL_CRITERIA_KEYS)
    assert not set(rubric.CONTENT_CRITERIA_KEYS) & set(rubric.HARD_CRITERIA_KEYS)


def test_aggregate_returns_full_score_and_ready_when_all_criteria_assessed() -> None:
    """A fully assessed rubric at value 1.0 yields 100 points and ``ready``."""
    total, verdict, missing, assessed = rubric.aggregate(_score_all(1.0))

    assert total == 100
    assert verdict == rubric.VERDICT_READY
    assert missing == []
    assert assessed == rubric.RUBRIC_TOTAL_WEIGHT


def test_aggregate_returns_lower_bound_without_verdict_when_coverage_too_low() -> None:
    """Below the minimum assessed weight the verdict is inconclusive (``None``)."""
    under_threshold = [
        rubric.CriterionScore(key="must_skills", group=rubric.GROUP_INHALT, value=1.0, weight=20),
        rubric.CriterionScore(key="semantic_fit", group=rubric.GROUP_INHALT, value=1.0, weight=12),
    ]

    total, verdict, missing, assessed = rubric.aggregate(under_threshold)

    assert assessed == 32
    assert assessed < rubric.MIN_ASSESSED_WEIGHT_FOR_VERDICT
    assert total == 32.0
    assert verdict is None
    assert "must_skills" not in missing


@pytest.mark.parametrize(
    ("value", "expected_verdict"),
    [
        (0.85, rubric.VERDICT_READY),
        (0.86, rubric.VERDICT_READY),
        (0.84, rubric.VERDICT_BORDERLINE),
        (0.70, rubric.VERDICT_BORDERLINE),
        (0.69, rubric.VERDICT_WEAK),
        (0.0, rubric.VERDICT_WEAK),
    ],
)
def test_aggregate_verdict_boundaries(value: float, expected_verdict: str) -> None:
    """The verdict follows the normalized quality at the fixed threshold edges."""
    total, verdict, _missing, _assessed = rubric.aggregate(_score_all(value))

    assert total == pytest.approx(value * 100)
    assert verdict == expected_verdict


def test_validate_criteria_reports_missing_keys_in_canon_order() -> None:
    """Unassessed canon keys are reported in canon order."""
    missing = rubric.validate_criteria(_score_all(1.0)[:2])

    assert missing == list(rubric.CANONICAL_CRITERIA_KEYS[2:])


def test_validate_criteria_raises_for_unknown_key() -> None:
    """A criterion key outside the canon is rejected."""
    bogus = [rubric.CriterionScore(key="not_in_canon", group=rubric.GROUP_INHALT, value=1.0, weight=1)]

    with pytest.raises(ValueError, match="not_in_canon"):
        rubric.validate_criteria(bogus)


def test_missing_criterion_returns_data_gap_with_canon_weight() -> None:
    """A missing criterion carries ``value=None`` and the canon weight/group."""
    score = rubric.missing_criterion("must_skills")

    assert score.value is None
    assert score.weight == rubric.CRITERIA_BY_KEY["must_skills"].weight
    assert score.group == rubric.GROUP_INHALT


def test_normalized_score_returns_none_for_zero_assessed_weight() -> None:
    """Without any assessed weight there is no normalized quality."""
    assert rubric.normalized_score(0.0, 0) is None


def test_normalized_score_scales_to_assessed_basis() -> None:
    """The normalized score divides the total by the assessed weight."""
    assert rubric.normalized_score(50.0, 50) == pytest.approx(100.0)
    assert rubric.normalized_score(25.0, 50) == pytest.approx(50.0)

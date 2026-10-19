"""Fixed score rubric canon and weighted aggregator (gjo_se_com).

Single source of truth for the application scoring rubric: which criteria
exist, their weights, their groups and the deterministic aggregation into a
total score with a fixed denominator of 100. No LLM is involved – the canon
is frozen (``WEIGHTS_VERSION``) so that scores stay reproducible and
comparable across runs.
"""

from __future__ import annotations

from dataclasses import dataclass

import structlog

logger = structlog.get_logger(__name__)

#: Version of the weight canon – frozen for the score history.
WEIGHTS_VERSION: str = "v1"
#: Fixed denominator of the rubric (sum of all canon weights).
RUBRIC_TOTAL_WEIGHT: int = 100
#: Rounding precision of the aggregated total score.
TOTAL_SCORE_DECIMALS: int = 2

#: Verdict for a strong match.
VERDICT_READY = "ready"
#: Verdict for a borderline match.
VERDICT_BORDERLINE = "borderline"
#: Verdict for a weak match.
VERDICT_WEAK = "weak"
#: Minimum total score for ``ready``.
VERDICT_READY_MIN = 85
#: Minimum total score for ``borderline``.
VERDICT_BORDERLINE_MIN = 70
#: Minimum assessed weight for a conclusive verdict.
MIN_ASSESSED_WEIGHT_FOR_VERDICT: int = 70

#: Group key for content criteria.
GROUP_INHALT = "inhalt"
#: Group key for form criteria.
GROUP_FORM = "form"
#: Group key for framework/hard criteria.
GROUP_RAHMEN = "rahmen"

#: Kind key for hard, rule-based criteria.
KIND_HARD = "hard"
#: Kind key for content criteria.
KIND_CONTENT = "content"


@dataclass(frozen=True, slots=True)
class ScoreCriterion:
    """One canon criterion with its fixed weight and group.

    Attributes:
        key: Stable criterion key (e.g. ``must_skills``).
        group: Group the criterion belongs to (``inhalt``/``form``/``rahmen``).
        label: Human-readable German label.
        weight: Fixed canon weight (points, sum over all criteria = 100).
        kind: Criterion kind (``hard`` for ``rahmen``, ``content`` otherwise).
    """

    key: str
    group: str
    label: str
    weight: int
    kind: str


#: Ordered rubric canon – order equals output order. Weights sum to 100.
SCORE_CRITERIA: list[ScoreCriterion] = [
    ScoreCriterion("must_skills", GROUP_INHALT, "Muss-Skills der Ausschreibung im CV", 20, KIND_CONTENT),
    ScoreCriterion("semantic_fit", GROUP_INHALT, "Semantische Gesamtpassung Ausschreibung ↔ Paket", 12, KIND_CONTENT),
    ScoreCriterion("domain_fit", GROUP_INHALT, "Domäne/Branche", 7, KIND_CONTENT),
    ScoreCriterion("seniority_fit", GROUP_INHALT, "Seniorität/Rollenfit", 6, KIND_CONTENT),
    ScoreCriterion("proof_evidence", GROUP_FORM, "Belegte Outcomes/Zahlen im Paket", 10, KIND_CONTENT),
    ScoreCriterion(
        "ats_format",
        GROUP_FORM,
        "ATS-Format/Vollständigkeit (Pflichtfelder, Parsebarkeit)",
        10,
        KIND_CONTENT,
    ),
    ScoreCriterion("rate_match", GROUP_RAHMEN, "Eigener Satz vs. Budget", 10, KIND_HARD),
    ScoreCriterion("start_match", GROUP_RAHMEN, "Verfügbarkeit vs. geforderter Start", 8, KIND_HARD),
    ScoreCriterion("remote_match", GROUP_RAHMEN, "Remote-Anteil", 7, KIND_HARD),
    ScoreCriterion("language_match", GROUP_RAHMEN, "Antwortsprache = Ausschreibungssprache (EN↔EN)", 5, KIND_HARD),
    ScoreCriterion("contract_match", GROUP_RAHMEN, "Einsatzform (freiberuflich/ANÜ)", 5, KIND_HARD),
]

#: Canon criteria by key for O(1) lookup.
CRITERIA_BY_KEY: dict[str, ScoreCriterion] = {criterion.key: criterion for criterion in SCORE_CRITERIA}

#: Canon keys in order.
CANONICAL_CRITERIA_KEYS: tuple[str, ...] = tuple(criterion.key for criterion in SCORE_CRITERIA)
#: Keys of content criteria in canon order.
CONTENT_CRITERIA_KEYS: tuple[str, ...] = tuple(
    criterion.key for criterion in SCORE_CRITERIA if criterion.kind == KIND_CONTENT
)
#: Keys of hard criteria in canon order.
HARD_CRITERIA_KEYS: tuple[str, ...] = tuple(
    criterion.key for criterion in SCORE_CRITERIA if criterion.kind == KIND_HARD
)


@dataclass(frozen=True, slots=True)
class CriterionScore:
    """Assessed value of a single criterion at evaluation time.

    Attributes:
        key: Criterion key (must exist in the canon).
        group: Group key (``inhalt``/``form``/``rahmen``).
        value: Assessment in 0–1; ``None`` marks a data gap / uncertainty.
        weight: Canon weight snapshot at evaluation time.
        reason: Justification of the assessment.
        evidence: Evidence drawn from project/applicant context.
        action: Derived recommended action.
    """

    key: str
    group: str
    value: float | None
    weight: int
    reason: str | None = None
    evidence: str | None = None
    action: str | None = None


def missing_criterion(key: str) -> CriterionScore:
    """Builds a data-gap entry for a canon criterion.

    Args:
        key: Canon criterion key.

    Returns:
        A ``CriterionScore`` with ``value=None`` and the canon weight.

    Raises:
        KeyError: If ``key`` is not part of the canon.
    """
    canon = CRITERIA_BY_KEY[key]
    return CriterionScore(
        key,
        group=canon.group,
        value=None,
        weight=canon.weight,
        reason="criterion not assessed",
        action=None,
    )


def validate_criteria(criteria: list[CriterionScore]) -> list[str]:
    """Validates assessed criteria against the canon.

    Args:
        criteria: Assessed criterion scores.

    Returns:
        Missing canon keys in canon order (empty if complete).

    Raises:
        ValueError: If a criterion key is not part of the canon.
    """
    for criterion in criteria:
        if criterion.key not in CRITERIA_BY_KEY:
            logger.exception("score_rubric_unknown_criterion", criterion_key=criterion.key)
            raise ValueError(f"Unknown criterion key: {criterion.key!r}")
    assessed_keys = {criterion.key for criterion in criteria}
    return [key for key in CANONICAL_CRITERIA_KEYS if key not in assessed_keys]


def normalized_score(total_score: float, assessed_weight: int) -> float | None:
    """Normalises the total score onto the assessed basis.

    A data gap (``value=None``) contributes 0 to ``total_score`` while lowering
    ``assessed_weight``; dividing by ``assessed_weight`` yields the quality on
    the criteria that were actually assessed.

    Args:
        total_score: Weighted total score (fixed denominator 100).
        assessed_weight: Sum of weights of criteria with ``value is not None``.

    Returns:
        ``total_score / assessed_weight × 100`` (rounded) or ``None`` if
        ``assessed_weight <= 0``.
    """
    if assessed_weight <= 0:
        return None
    return round(total_score / assessed_weight * 100, TOTAL_SCORE_DECIMALS)


def _resolve_verdict(total_score: float) -> str:
    """Maps a total score to its verdict (fixed rule)."""
    if total_score >= VERDICT_READY_MIN:
        return VERDICT_READY
    if total_score >= VERDICT_BORDERLINE_MIN:
        return VERDICT_BORDERLINE
    return VERDICT_WEAK


def aggregate(criteria: list[CriterionScore]) -> tuple[float, str | None, list[str], int]:
    """Aggregates assessed criteria into a weighted total score.

    Uses a fixed denominator of 100 without renormalisation: a ``value=None``
    criterion contributes 0 and lowers ``assessed_weight`` (coverage), so a
    coverage below 100 makes ``total_score`` a lower bound. The ``verdict`` is
    derived from the quality on the assessed basis (``normalized_score``) and
    is ``None`` (not conclusively assessable) when ``assessed_weight`` is below
    :data:`MIN_ASSESSED_WEIGHT_FOR_VERDICT`.

    Args:
        criteria: Assessed criterion scores.

    Returns:
        ``(total_score, verdict, missing_keys, assessed_weight)`` where
        ``verdict`` is ``None`` for an inconclusive data basis.

    Raises:
        ValueError: If a criterion key is not part of the canon.
    """
    missing_keys = validate_criteria(criteria)
    total_score = round(
        sum((criterion.value or 0.0) * criterion.weight for criterion in criteria),
        TOTAL_SCORE_DECIMALS,
    )
    assessed_weight = sum(criterion.weight for criterion in criteria if criterion.value is not None)
    if assessed_weight < MIN_ASSESSED_WEIGHT_FOR_VERDICT:
        return total_score, None, missing_keys, assessed_weight
    normalized = normalized_score(total_score, assessed_weight)
    return total_score, _resolve_verdict(normalized or 0.0), missing_keys, assessed_weight

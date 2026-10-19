"""Deterministic hard facts for the application score (gjo_se_com).

Computes the five ``rahmen`` criteria (rate, start, remote, language, contract)
purely rule-based – no LLM, no guessing. Missing data yields ``value=None`` with
a concrete cause instead of a fabricated assessment, so hard facts stay
reproducible and comparable. The function is pure (no DB/IO) and receives the
ORM objects from the caller.
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

import structlog

from app.application.domain import (
    application_contract,
    application_onsite_rules,
)
from app.application.domain.application_score_rubric_rules import (
    CRITERIA_BY_KEY,
    GROUP_RAHMEN,
    CriterionScore,
)
from app.shared.parsing import start_dates as application_start

if TYPE_CHECKING:
    from app.application.schemas.profile_schemas import ProfileOut
    from app.application.schemas.submission_schemas import SubmissionDetailOut
    from app.shared.ports.project import ProjectRef

logger = structlog.get_logger(__name__)

#: Mail languages supported by the application mail (reference: mail service).
_SUPPORTED_LANGUAGES: tuple[str, ...] = ("de", "en")

#: German function-word markers for the deterministic language heuristic.
_GERMAN_MARKERS: tuple[str, ...] = (
    " der ",
    " die ",
    " das ",
    " und ",
    " mit ",
    " für ",
    " wir ",
    " ist ",
    " sie ",
    " von ",
    " den ",
    " im ",
    " nicht ",
    " werden ",
)
#: English function-word markers for the deterministic language heuristic.
_ENGLISH_MARKERS: tuple[str, ...] = (
    " the ",
    " and ",
    " with ",
    " for ",
    " we ",
    " is ",
    " they ",
    " of ",
    " in ",
    " not ",
    " will ",
)
#: Characters that raise the German likelihood by a single bonus hit.
_UMLAUT_CHARS = "äöüß"

#: Budget range anchored on a currency symbol, e.g. ``80-100 €``.
_BUDGET_RANGE_PATTERN = re.compile(r"(\d{2,3})\s*(?:-|–|bis)\s*(\d{2,3})\s*(?:€|EUR|Euro)", re.IGNORECASE)
#: Single budget value anchored on a currency symbol, e.g. ``95 EUR``.
_BUDGET_SINGLE_PATTERN = re.compile(r"(\d{2,3})\s*(?:€|EUR|Euro)", re.IGNORECASE)
#: Lower bound of a plausible hourly rate in EUR/h.
_MIN_PLAUSIBLE_RATE: int = 20
#: Upper bound of a plausible hourly rate in EUR/h.
_MAX_PLAUSIBLE_RATE: int = 250

#: Multiplier up to which a slight budget overrun is tolerated.
_RATE_TOLERANCE_NEAR: float = 1.10
#: Multiplier up to which a moderate budget overrun is tolerated.
_RATE_TOLERANCE_FAR: float = 1.25
#: Criterion value when the own rate stays within budget.
_RATE_VALUE_FULL: float = 1.0
#: Criterion value within the near tolerance band.
_RATE_VALUE_NEAR: float = 0.7
#: Criterion value within the far tolerance band.
_RATE_VALUE_FAR: float = 0.4
#: Criterion value beyond the far tolerance band.
_RATE_VALUE_NONE: float = 0.0

#: Applicant-side action to fix a missing profile datum.
_ACTION_PROFILE_COMPLETE = "Profil ergänzen"


def _criterion(
    key: str,
    *,
    value: float | None,
    reason: str,
    action: str | None = None,
) -> CriterionScore:
    """Builds a ``rahmen`` criterion score with the canon weight.

    Args:
        key: Canon criterion key (must be a ``rahmen`` key).
        value: Assessment in 0–1, or ``None`` for a data gap.
        reason: Justification naming the compared sources/values.
        action: Recommended action, or ``None`` when not applicant-fixable.

    Returns:
        A ``CriterionScore`` with ``group=rahmen`` and the canon weight.
    """
    canon = CRITERIA_BY_KEY[key]
    return CriterionScore(
        key=key,
        group=GROUP_RAHMEN,
        value=value,
        weight=canon.weight,
        reason=reason,
        action=action,
    )


def _own_rate(project: ProjectRef, profile: ProfileOut) -> int | None:
    """Resolves the own hourly rate, preferring the manually kept project value.

    Args:
        project: Project ORM object (``my_hourly_rate`` has priority).
        profile: Applicant profile (``hourly_rate`` is a ``Decimal`` fallback).

    Returns:
        The own rate in EUR/h, or ``None`` when neither source is set.
    """
    if project.my_hourly_rate is not None:
        return project.my_hourly_rate
    if profile.hourly_rate is not None:
        return int(profile.hourly_rate)
    return None


def _budget_from_text(text: str) -> int | None:
    """Extracts the highest plausible budget candidate from a posting text.

    Range matches contribute their upper bound, single values their own value;
    the maximum over all candidates within the plausible hourly-rate band is
    returned. Implausible amounts outside the hourly-rate band are ignored.

    Args:
        text: The resolved posting text.

    Returns:
        The highest plausible budget candidate in EUR/h, or ``None`` when none
        is found.
    """
    candidates = [int(match.group(2)) for match in _BUDGET_RANGE_PATTERN.finditer(text)]
    candidates.extend(int(match.group(1)) for match in _BUDGET_SINGLE_PATTERN.finditer(text))
    plausible = [value for value in candidates if _MIN_PLAUSIBLE_RATE <= value <= _MAX_PLAUSIBLE_RATE]
    if not plausible:
        return None
    return max(plausible)


def _budget(project: ProjectRef, ausschreibung_text: str) -> int | None:
    """Resolves the posting budget, preferring the text range over the estimate.

    Args:
        project: Project ORM object (``hourly_rate`` = estimated upper bound).
        ausschreibung_text: The resolved posting text.

    Returns:
        The text-derived budget, else ``project.hourly_rate``, else ``None``.
    """
    text_budget = _budget_from_text(ausschreibung_text)
    if text_budget is not None:
        return text_budget
    return project.hourly_rate


def _detect_text_language(text: str) -> str | None:
    """Detects the posting language via deterministic function-word counting.

    Args:
        text: The resolved posting text.

    Returns:
        ``"de"``/``"en"`` when one side wins, ``None`` on a tie (ambiguous).
    """
    lowered = f" {text.lower()} "
    german_hits = sum(lowered.count(marker) for marker in _GERMAN_MARKERS)
    if any(char in lowered for char in _UMLAUT_CHARS):
        german_hits += 1
    english_hits = sum(lowered.count(marker) for marker in _ENGLISH_MARKERS)
    if german_hits == english_hits:
        return None
    return "de" if german_hits > english_hits else "en"


def _remote_affinity(profile: ProfileOut) -> str | None:
    """Derives the applicant's remote affinity from the free-text ``remote`` field.

    Args:
        profile: Applicant profile.

    Returns:
        ``"remote"`` for remote affinity, ``"hybrid"`` for hybrid affinity
        (indifferent), ``"onsite"`` when set without remote reference, ``None``
        when the field is empty.
    """
    if not profile.remote:
        return None
    value = profile.remote.lower()
    if "hybrid" in value:
        return "hybrid"
    if "remote" in value:
        return "remote"
    return "onsite"


def _rate_match(project: ProjectRef, profile: ProfileOut, ausschreibung_text: str) -> CriterionScore:
    """Assesses the own rate against the posting budget (deterministic)."""
    own = _own_rate(project, profile)
    if own is None:
        return _criterion(
            "rate_match",
            value=None,
            reason="own rate missing",
            action=_ACTION_PROFILE_COMPLETE,
        )
    budget = _budget(project, ausschreibung_text)
    if budget is None:
        return _criterion(
            "rate_match",
            value=None,
            reason="no budget in description/estimate",
            action=None,
        )
    source = "text range/value" if _budget_from_text(ausschreibung_text) is not None else "project.hourly_rate"
    if own <= budget:
        value = _RATE_VALUE_FULL
        band = ""
    elif own <= budget * _RATE_TOLERANCE_NEAR:
        value = _RATE_VALUE_NEAR
        band = " (+10 % Toleranz)"
    elif own <= budget * _RATE_TOLERANCE_FAR:
        value = _RATE_VALUE_FAR
        band = " (+25 % Toleranz)"
    else:
        value = _RATE_VALUE_NONE
        band = " (>25 % über Budget)"
    return _criterion(
        "rate_match",
        value=value,
        reason=f"own rate {own} EUR/h vs. budget {budget} EUR/h ({source}){band}",
        action=None if value == _RATE_VALUE_FULL else "Satz auf ≤ budget senken",
    )


def _start_match(
    project: ProjectRef,
    profile: ProfileOut,
    ausschreibung_text: str,
) -> CriterionScore:
    """Assesses the availability against the required start (deterministic).

    The required start is resolved via the shared ``application_start`` resolver:
    manual override (``project.my_start_date``) → posting text → structured
    ``project.start_date``; only when no source yields a date is the value
    ``None``.
    """
    required = application_start.resolve_required_start(
        text=ausschreibung_text,
        field_value=project.start_date,
        manual=project.my_start_date,
    )
    if required is None:
        return _criterion("start_match", value=None, reason="start date not parseable", action=None)
    if profile.available_from is None:
        return _criterion(
            "start_match",
            value=None,
            reason="availability missing",
            action=_ACTION_PROFILE_COMPLETE,
        )
    matched = profile.available_from <= required.value
    return _criterion(
        "start_match",
        value=1.0 if matched else 0.0,
        reason=(
            f"available from {profile.available_from.isoformat()} "
            f"vs. start {required.value.isoformat()} ({required.source})"
        ),
        action=None if matched else "frühere Verfügbarkeit nennen",
    )


def _remote_match(
    project: ProjectRef,
    profile: ProfileOut,
    ausschreibung_text: str,
) -> CriterionScore:
    """Assesses the required remote/on-site share against the applicant affinity.

    The required share comes from the posting text first (``text``) and only
    falls back to ``project.remote_percent`` (``project.remote_percent``); the
    chosen source is named in ``reason`` so the score stays explainable. When
    neither source yields a value the criterion is a data gap.
    """
    percent, source = application_onsite_rules.resolve_required_remote_percent(
        text=ausschreibung_text,
        field_percent=project.remote_percent,
    )
    if percent is None:
        return _criterion(
            "remote_match",
            value=None,
            reason="required remote share unknown (text/field)",
            action=None,
        )
    affinity = _remote_affinity(profile)
    if affinity is None:
        return _criterion(
            "remote_match",
            value=None,
            reason=f"required remote {percent}% ({source}) but profile remote affinity missing",
            action=_ACTION_PROFILE_COMPLETE,
        )
    if affinity == "hybrid":
        return _criterion(
            "remote_match",
            value=1.0,
            reason=f"required remote {percent}% ({source}) vs. profile affinity hybrid",
        )
    raw = percent / 100.0 if affinity == "remote" else (100 - percent) / 100.0
    return _criterion(
        "remote_match",
        value=max(0.0, min(raw, 1.0)),
        reason=f"required remote {percent}% ({source}) vs. profile affinity {affinity}",
    )


def _language_match(
    profile: ProfileOut,
    submission: SubmissionDetailOut,
    ausschreibung_text: str,
) -> CriterionScore:
    """Assesses mail language against posting language (deterministic, EN↔EN)."""
    text_lang = _detect_text_language(ausschreibung_text)
    if text_lang is None:
        return _criterion(
            "language_match",
            value=None,
            reason="posting language not detectable",
            action=None,
        )
    mail_lang = submission.language
    if not mail_lang or mail_lang not in _SUPPORTED_LANGUAGES:
        return _criterion(
            "language_match",
            value=None,
            reason="mail language missing or unsupported",
            action="Mail-Sprache setzen",
        )
    profile_languages = profile.languages or "n/a"
    matched = text_lang == mail_lang
    return _criterion(
        "language_match",
        value=1.0 if matched else 0.0,
        reason=f"posting {text_lang} vs. mail {mail_lang}; profile languages: {profile_languages}",
        action=None if matched else f"Mail in {text_lang} verfassen",
    )


def _contract_match(project: ProjectRef, ausschreibung_text: str) -> CriterionScore:
    """Assesses the engagement type (freelance vs. ANÜ/perm) deterministically.

    The posting text takes precedence over ``project.contract_type`` (via
    :mod:`application_contract`), but only on a non-negated statement – the
    contract text is negation-heavy ("Kein ANÜ", "Freelancer ausgeschlossen").
    The chosen source is named in ``reason``.
    """
    model, source = application_contract.resolve_required_contract(
        text=ausschreibung_text,
        field=project.contract_type,
    )
    if model is None:
        return _criterion(
            "contract_match",
            value=None,
            reason="engagement type unknown in contract_type and text",
            action=None,
        )
    matches = model == application_contract.FREELANCE
    label = "freelance (fits)" if matches else "non-freelance ANÜ/Festanstellung (blocker)"
    return _criterion(
        "contract_match",
        value=1.0 if matches else 0.0,
        reason=f"required engagement {label} ({source})",
    )


def compute_hard_facts(
    *,
    project: ProjectRef,
    profile: ProfileOut,
    submission: SubmissionDetailOut,
    ausschreibung_text: str,
) -> list[CriterionScore]:
    """Computes the five deterministic ``rahmen`` criteria (no LLM, no guessing).

    Args:
        project: Project ORM object with the posting fields.
        profile: Applicant profile ORM object.
        submission: Application submission ORM object (mail language).
        ausschreibung_text: The resolved posting text (after any override), so
            language/budget detection sees the same text as downstream steps.

    Returns:
        Exactly five ``CriterionScore`` in canon order: ``rate_match``,
        ``start_match``, ``remote_match``, ``language_match``, ``contract_match``.

    Raises:
        Exception: Re-raises any unexpected error after logging with context.
    """
    try:
        return [
            _rate_match(project, profile, ausschreibung_text),
            _start_match(project, profile, ausschreibung_text),
            _remote_match(project, profile, ausschreibung_text),
            _language_match(profile, submission, ausschreibung_text),
            _contract_match(project, ausschreibung_text),
        ]
    except Exception:
        logger.exception("score_hard_facts_failed", project_id=project.id)
        raise

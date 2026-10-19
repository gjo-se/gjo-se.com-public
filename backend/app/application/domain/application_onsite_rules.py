"""Deterministic on-site / remote resolution for the application score and CV.

The free-text job posting has precedence over the structured
``project.remote_percent`` field: broker form fields frequently contradict the
posting text (e.g. field ``remote_percent=100`` while the text requires
"2 Tage/Woche vor Ort"). The text scan is intentionally conservative – it only
yields a value when an explicit numeric signal is present (a percent share or
on-site days per week). Fuzzy wording ("gelegentlich", "nach Bedarf") is not
quantified and falls back to the field, so no value is ever fabricated.
"""

from __future__ import annotations

import re

#: Source tag when the text scan produced the value.
SOURCE_TEXT = "text"
#: Source tag when the structured project field produced the value.
SOURCE_FIELD = "project.remote_percent"
#: Source tag when neither source yields a value.
SOURCE_NONE = "none"

#: Fully-remote statements, e.g. ``100% Remote``/``Fully remote``.
_FULLY_REMOTE_PATTERN = re.compile(
    r"100\s*%\s*(?:remote|home\s*office)|fully\s*remote|vollst[äa]ndig\s*remote",
    re.IGNORECASE,
)
#: Explicit ``Remote/On-Site: remote|onsite`` field.
_REMOTE_ONSITE_FIELD_PATTERN = re.compile(
    r"remote\s*/\s*on-?site\s*:\s*(remote|on-?site)",
    re.IGNORECASE,
)
#: Explicit remote share, e.g. ``90 % remote``/``Remote-Anteil: 80 %``.
_REMOTE_SHARE_PATTERN = re.compile(
    r"(\d{1,3})\s*%\s*(?:remote|home\s*office)"
    r"|(?:remote|home\s*office)[^\d%]{0,15}(\d{1,3})\s*%",
    re.IGNORECASE,
)
#: Explicit on-site share, e.g. ``10 % vor Ort``/``vor Ort 20 %``.
_ONSITE_SHARE_PATTERN = re.compile(
    r"(\d{1,3})\s*%\s*(?:vor\s*ort|on-?site|pr[äa]senz)"
    r"|(?:vor\s*ort|on-?site|pr[äa]senz)[^\d%]{0,12}(\d{1,3})\s*%",
    re.IGNORECASE,
)
#: On-site days per week, e.g. ``2 Tage / Woche``/``1 Tag pro Woche``.
_ONSITE_DAYS_WEEK_PATTERN = re.compile(
    r"(\d{1,2})\s*(?:-|–|bis)?\s*\d{0,2}\s*tag(?:e|en)?\s*(?:/|pro|die|je)\s*woche",
    re.IGNORECASE,
)
#: Markers that qualify an on-site-days hit (must appear next to the match).
_ONSITE_MARKERS: tuple[str, ...] = (
    "vor ort",
    "vor-ort",
    "onsite",
    "on-site",
    "on site",
    "präsenz",
    "praesenz",
)
#: Working days per week used to convert on-site days into a remote share.
_WORKDAYS_PER_WEEK = 5
#: Character window around a days/week hit that must carry an on-site marker.
_ONSITE_CONTEXT_WINDOW = 80

#: Lower/upper bound of a valid remote share.
_PERCENT_MIN = 0
_PERCENT_MAX = 100


def _clamp_percent(value: int) -> int:
    """Clamps a remote share to ``[0, 100]``."""
    return max(_PERCENT_MIN, min(_PERCENT_MAX, value))


def _first_group_int(match: re.Match[str]) -> int | None:
    """Returns the first non-empty capture group of ``match`` as ``int``."""
    for group in match.groups():
        if group is not None:
            return int(group)
    return None


def _onsite_days_per_week(text: str) -> int | None:
    """Returns on-site days per week near an on-site marker, or ``None``.

    The proximity check prevents pure workload statements ("4 Tage die Woche")
    from being misread as an on-site requirement.
    """
    for match in _ONSITE_DAYS_WEEK_PATTERN.finditer(text):
        start = max(0, match.start() - _ONSITE_CONTEXT_WINDOW)
        end = match.end() + _ONSITE_CONTEXT_WINDOW
        window = text[start:end].lower()
        if any(marker in window for marker in _ONSITE_MARKERS):
            return int(match.group(1))
    return None


def remote_percent_from_text(text: str | None) -> int | None:
    """Extracts the required remote share (0–100) from a posting text.

    Returns ``None`` when the text carries no explicit numeric signal (neither a
    percent share nor on-site days per week), so the caller can fall back to the
    structured field instead of guessing.
    """
    if not text:
        return None

    if _FULLY_REMOTE_PATTERN.search(text):
        return 100

    field_match = _REMOTE_ONSITE_FIELD_PATTERN.search(text)
    if field_match is not None:
        return 100 if field_match.group(1).lower().startswith("remote") else 0

    remote_match = _REMOTE_SHARE_PATTERN.search(text)
    if remote_match is not None:
        percent = _first_group_int(remote_match)
        if percent is not None:
            return _clamp_percent(percent)

    onsite_match = _ONSITE_SHARE_PATTERN.search(text)
    if onsite_match is not None:
        percent = _first_group_int(onsite_match)
        if percent is not None:
            return _clamp_percent(100 - percent)

    days = _onsite_days_per_week(text)
    if days is not None:
        return _clamp_percent(round(100 - (days / _WORKDAYS_PER_WEEK) * 100))

    return None


def resolve_required_remote_percent(
    *,
    text: str | None,
    field_percent: int | None,
) -> tuple[int | None, str]:
    """Resolves the required remote share with text precedence over the field.

    Args:
        text: The resolved posting text (may be ``None``).
        field_percent: The structured ``project.remote_percent`` (may be ``None``).

    Returns:
        Tuple of ``(percent, source)`` where ``source`` is one of
        :data:`SOURCE_TEXT`, :data:`SOURCE_FIELD` or :data:`SOURCE_NONE`.
    """
    text_percent = remote_percent_from_text(text)
    if text_percent is not None:
        return text_percent, SOURCE_TEXT
    if field_percent is not None:
        return _clamp_percent(field_percent), SOURCE_FIELD
    return None, SOURCE_NONE


def requires_onsite(percent: int | None) -> bool:
    """Returns ``True`` when a resolved remote share implies on-site presence."""
    return percent is not None and percent < _PERCENT_MAX

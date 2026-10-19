"""Deterministic start-date resolution for the application CV and score.

Precedence: the manually curated ``project.my_start_date`` wins over everything,
then the free-text job posting, then the structured ``project.start_date`` field.
Broker form fields frequently contradict the posting text, and the field only
carries month granularity (``MM/YYYY``). The scan is intentionally conservative –
it only yields a value when an explicit signal is present, so no date is ever
fabricated. A manual ignore token (see :data:`IGNORE_TOKENS`) suppresses all
sources; a manual immediate token (see :data:`IMMEDIATE_TOKENS`, e.g. ``asap``)
suppresses them too, but reads as an explicit "as early as possible" instead of
an explicit "unknown".

Two precisions are distinguished so the CV never invents a day the source does
not state: ``day`` (``DD.MM.YYYY`` / ISO in the text) and ``month`` (structured
field or a month name in the text). An "as early as possible" demand (``asap``,
``ab sofort``, ``kurzfristig``, ``nächstmöglich``) suppresses the structured
field as well – the text governs, and the profile's own ``available_from`` then
decides the rendering (see ``cv_service``).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

#: Date precision of a resolved start.
Precision = Literal["day", "month"]

#: Source tag when the text scan produced the value.
SOURCE_TEXT = "text"
#: Source tag when the structured project field produced the value.
SOURCE_FIELD = "project.start_date"
#: Source tag when the manually curated ``project.my_start_date`` produced the value.
SOURCE_MANUAL = "project.my_start_date"

#: Tokens that explicitly ignore the start (manual override). The start is then
#: treated as unknown: the CV falls back to the profile availability and the
#: score treats it as a data gap.
IGNORE_TOKENS: frozenset[str] = frozenset({"-", "nein", "kein", "keine", "ignore", "n/a", "na"})

#: Manually entered start date (``DD.MM.YYYY``) – the field form is handled by
#: :data:`_START_FIELD_PATTERN`.
_MANUAL_DAY_PATTERN = re.compile(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$")

#: Labels that introduce a start date in the posting text.
_START_PREFIX = r"(?:ab|start(?:\s*date)?|beginn|laufzeit|zum)"
#: Gap between the label and the date. Absorbs markdown emphasis and qualifiers
#: (``**Start**: …``, ``ab frühestens …``) without crossing a digit – so the
#: match stays local to the label.
_START_GAP = r"[^\d\n]{0,20}?"
#: German start date, e.g. ``ab 15.10.2026`` / ``Start: 15.10.2026`` (day, month, year).
_START_TEXT_DE_PATTERN = re.compile(
    rf"{_START_PREFIX}{_START_GAP}(\d{{1,2}})\.(\d{{1,2}})\.(\d{{4}})",
    re.IGNORECASE,
)
#: ISO start date, e.g. ``ab 2026-10-15`` (year, month, day).
_START_TEXT_ISO_PATTERN = re.compile(
    rf"{_START_PREFIX}{_START_GAP}(\d{{4}})-(\d{{2}})-(\d{{2}})",
    re.IGNORECASE,
)
#: Month name + year start, e.g. ``Start: Oktober 2026`` (month, year).
_START_TEXT_MONTH_PATTERN = re.compile(
    rf"{_START_PREFIX}{_START_GAP}([A-Za-zäöüÄÖÜ]+)\s+(\d{{4}})",
    re.IGNORECASE,
)
#: Structured start field produced by the freelancermap mapper (``M/YYYY``).
_START_FIELD_PATTERN = re.compile(r"^(\d{1,2})/(\d{4})$")

#: German and English month names → month number (lowercased keys).
_MONTH_NAMES: dict[str, int] = {
    "januar": 1,
    "februar": 2,
    "märz": 3,
    "maerz": 3,
    "april": 4,
    "mai": 5,
    "juni": 6,
    "juli": 7,
    "august": 8,
    "september": 9,
    "oktober": 10,
    "november": 11,
    "dezember": 12,
    "january": 1,
    "february": 2,
    "march": 3,
    "may": 5,
    "june": 6,
    "july": 7,
    "october": 10,
    "december": 12,
}
#: German month names for rendering month-precision starts.
_MONTH_LABELS_DE: tuple[str, ...] = (
    "",
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
)

#: Markers of an "as early as possible" demand (no concrete date). They carry
#: text precedence too: when the posting demands one, the structured field must
#: not be mirrored.
_IMMEDIATE_MARKERS: tuple[str, ...] = (
    "asap",
    "sofort",
    "kurzfristig",
    "nächstmöglich",
    "naechstmoeglich",
    "schnellstmöglich",
    "schnellstmoeglich",
)

#: Manual override tokens that explicitly request an "as early as possible"
#: start (no concrete date). Stored verbatim (lowercased) and resolved to "no
#: date" – equivalent to the text markers in :data:`_IMMEDIATE_MARKERS`, so the
#: manual override can express a start that is immediate by design.
IMMEDIATE_TOKENS: frozenset[str] = frozenset(_IMMEDIATE_MARKERS)

#: Valid month bounds of the start-date parsers.
_MONTH_MIN = 1
_MONTH_MAX = 12


@dataclass(frozen=True)
class RequiredStart:
    """A resolved start date with its precision and source."""

    value: date
    precision: Precision
    source: str


def _safe_date(year: int, month: int, day: int) -> date | None:
    """Builds a ``date`` when the components are valid, else ``None``."""
    if not _MONTH_MIN <= month <= _MONTH_MAX:
        return None
    try:
        return date(year, month, day)
    except ValueError:
        return None


def start_from_text(text: str | None) -> RequiredStart | None:
    """Extracts the required start from the posting text, or ``None``.

    Tries the German ``DD.MM.YYYY`` form first, then ISO ``YYYY-MM-DD``, then a
    month name with year (``Oktober 2026``). Each form is anchored on a start
    label. The result is conservative: an "asap" demand without a date yields
    ``None`` (see :func:`requires_immediate_start`).
    """
    if not text:
        return None

    match = _START_TEXT_DE_PATTERN.search(text)
    if match is not None:
        day, month, year = (int(part) for part in match.groups())
        value = _safe_date(year, month, day)
        if value is not None:
            return RequiredStart(value=value, precision="day", source=SOURCE_TEXT)

    match = _START_TEXT_ISO_PATTERN.search(text)
    if match is not None:
        year, month, day = (int(part) for part in match.groups())
        value = _safe_date(year, month, day)
        if value is not None:
            return RequiredStart(value=value, precision="day", source=SOURCE_TEXT)

    match = _START_TEXT_MONTH_PATTERN.search(text)
    if match is not None:
        month = _MONTH_NAMES.get(match.group(1).lower())
        if month is not None:
            value = _safe_date(int(match.group(2)), month, 1)
            if value is not None:
                return RequiredStart(value=value, precision="month", source=SOURCE_TEXT)

    return None


def start_from_field(value: str | None) -> RequiredStart | None:
    """Extracts the required start from ``project.start_date`` (``MM/YYYY``)."""
    if not value:
        return None
    match = _START_FIELD_PATTERN.match(value.strip())
    if match is None:
        return None
    month = int(match.group(1))
    result = _safe_date(int(match.group(2)), month, 1)
    if result is None:
        return None
    return RequiredStart(value=result, precision="month", source=SOURCE_FIELD)


def start_from_manual(value: str | None) -> RequiredStart | None:
    """Parses the manually curated ``project.my_start_date`` (``MM/YYYY``/``DD.MM.YYYY``).

    Returns ``None`` for a missing value, an ignore token (see
    :data:`IGNORE_TOKENS`), an immediate token (see :func:`is_immediate_token`)
    or an unparseable value.
    """
    if not value:
        return None
    token = value.strip()
    field_start = start_from_field(token)
    if field_start is not None:
        return RequiredStart(
            value=field_start.value,
            precision=field_start.precision,
            source=SOURCE_MANUAL,
        )
    match = _MANUAL_DAY_PATTERN.match(token)
    if match is None:
        return None
    day, month, year = (int(part) for part in match.groups())
    day_value = _safe_date(year, month, day)
    if day_value is None:
        return None
    return RequiredStart(value=day_value, precision="day", source=SOURCE_MANUAL)


def is_immediate_token(value: str | None) -> bool:
    """Returns ``True`` for a manual ``asap``/``sofort``-style immediate token.

    Accepts the markers from :data:`IMMEDIATE_TOKENS` verbatim (case-insensitive)
    and the common ``ab sofort`` phrasing. An ignore token is **not** immediate.
    """
    if not value:
        return False
    token = value.strip().lower()
    if token in IMMEDIATE_TOKENS:
        return True
    return token.removeprefix("ab ").strip() in IMMEDIATE_TOKENS


def resolve_required_start(
    *,
    text: str | None,
    field_value: str | None,
    manual: str | None = None,
) -> RequiredStart | None:
    """Resolves the required start with **manual precedence** over text and field.

    Precedence: ``project.my_start_date`` (manual) → posting text → structured
    ``project.start_date`` field. A manual ignore token suppresses text and field
    alike, so the start is treated as unknown. A manual immediate token
    (``asap``/``sofort``, see :func:`is_immediate_token`) suppresses them too, but
    reads as an explicit "as early as possible".

    Args:
        text: The resolved posting text (may be ``None``).
        field_value: The structured ``project.start_date`` (``MM/YYYY``, may be
            ``None``).
        manual: The manually curated ``project.my_start_date`` (may be ``None``).

    Returns:
        The resolved :class:`RequiredStart`, or ``None`` when no source yields a
        concrete date – either because the posting demands an immediate start or
        because the manual override explicitly ignores or requests it (then the
        field must not be mirrored) or because neither source mentions one.
    """
    if manual and manual.strip():
        token = manual.strip()
        if token.lower() in IGNORE_TOKENS:
            return None
        if is_immediate_token(token):
            return None
        manual_start = start_from_manual(token)
        if manual_start is not None:
            return manual_start

    text_start = start_from_text(text)
    if text_start is not None:
        return text_start
    if requires_immediate_start(text):
        return None
    return start_from_field(field_value)


def requires_immediate_start(text: str | None) -> bool:
    """Returns ``True`` when the posting demands an "as early as possible" start."""
    if not text:
        return False
    lowered = text.lower()
    return any(marker in lowered for marker in _IMMEDIATE_MARKERS)


def render_start(required: RequiredStart) -> str:
    """Renders a resolved start for the CV (``DD.MM.YYYY`` or ``<Monat> <Jahr>``)."""
    if required.precision == "month":
        return f"{_MONTH_LABELS_DE[required.value.month]} {required.value.year}"
    return required.value.strftime("%d.%m.%Y")

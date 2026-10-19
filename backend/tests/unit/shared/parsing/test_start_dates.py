"""Unit tests for deterministic start-date resolution."""

from __future__ import annotations

from datetime import date

import pytest

from app.shared.parsing.start_dates import (
    SOURCE_FIELD,
    SOURCE_MANUAL,
    SOURCE_TEXT,
    is_immediate_token,
    render_start,
    requires_immediate_start,
    resolve_required_start,
    start_from_field,
    start_from_manual,
    start_from_text,
)

pytestmark = pytest.mark.unit


def test_start_from_text_german_date_returns_day_precision() -> None:
    """A German DD.MM.YYYY after a start label resolves to day precision."""
    result = start_from_text("Projektstart ab 15.10.2026 in Berlin")

    assert result is not None
    assert result.value == date(2026, 10, 15)
    assert result.precision == "day"
    assert result.source == SOURCE_TEXT


def test_start_from_text_iso_date_returns_day_precision() -> None:
    """An ISO date after a start label resolves to day precision."""
    result = start_from_text("Start: 2026-10-15")

    assert result is not None
    assert result.value == date(2026, 10, 15)
    assert result.precision == "day"


def test_start_from_text_month_name_returns_month_precision() -> None:
    """A month name with year resolves to month precision on the first day."""
    result = start_from_text("Beginn: Oktober 2026")

    assert result is not None
    assert result.value == date(2026, 10, 1)
    assert result.precision == "month"


def test_start_from_text_invalid_calendar_date_returns_none() -> None:
    """A labelled but impossible date (month 13) yields no result."""
    assert start_from_text("ab 15.13.2026") is None


def test_start_from_text_without_signal_returns_none() -> None:
    """Free text without a start label yields no fabricated date."""
    assert start_from_text("Wir suchen einen Entwickler.") is None


def test_start_from_field_parses_month_year_pattern() -> None:
    """The structured MM/YYYY field yields a month-precision start."""
    result = start_from_field("10/2026")

    assert result is not None
    assert result.value == date(2026, 10, 1)
    assert result.precision == "month"
    assert result.source == SOURCE_FIELD


def test_start_from_field_rejects_out_of_range_month() -> None:
    """A month outside 1-12 is rejected."""
    assert start_from_field("13/2026") is None


def test_start_from_manual_day_precision_wins_over_field() -> None:
    """A manual DD.MM.YYYY is parsed at day precision with the manual source tag."""
    result = start_from_manual("15.10.2026")

    assert result is not None
    assert result.value == date(2026, 10, 15)
    assert result.precision == "day"
    assert result.source == SOURCE_MANUAL


def test_start_from_manual_ignore_token_returns_none() -> None:
    """An ignore token in the manual field yields no resolved start."""
    assert start_from_manual("nein") is None


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("asap", True),
        ("ab sofort", True),
        ("kurzfristig", True),
        ("15.10.2026", False),
        ("nein", False),
        (None, False),
    ],
)
def test_is_immediate_token_matches_documented_tokens(text: str | None, expected: bool) -> None:
    """Immediate tokens (incl. 'ab sofort') are recognised, dates/ignore are not."""
    assert is_immediate_token(text) is expected


def test_requires_immediate_start_detects_marker() -> None:
    """A posting text demanding an immediate start is detected."""
    assert requires_immediate_start("Bitte schnellstmöglich starten") is True
    assert requires_immediate_start("Start ab 01.11.2026") is False


def test_resolve_required_start_prefers_manual_over_text_and_field() -> None:
    """Manual precedence: the curated manual value overrides text and field."""
    result = resolve_required_start(
        text="Start ab 15.10.2026",
        field_value="11/2026",
        manual="01.12.2026",
    )

    assert result is not None
    assert result.value == date(2026, 12, 1)
    assert result.source == SOURCE_MANUAL


def test_resolve_required_start_immediate_text_suppresses_field() -> None:
    """An immediate-text demand suppresses the structured field (no mirroring)."""
    result = resolve_required_start(text="Start asap", field_value="11/2026")

    assert result is None


def test_resolve_required_start_falls_back_to_field_when_no_text_signal() -> None:
    """Without a manual or text signal the structured field is used."""
    result = resolve_required_start(text="Kein Startdatum genannt", field_value="11/2026")

    assert result is not None
    assert result.value == date(2026, 11, 1)
    assert result.source == SOURCE_FIELD


def test_render_start_formats_day_and_month_precision() -> None:
    """Rendering uses DD.MM.YYYY for day and '<Monat> <Jahr>' for month precision."""
    day = start_from_text("Start: 15.10.2026")
    month = start_from_field("10/2026")

    assert day is not None and month is not None
    assert render_start(day) == "15.10.2026"
    assert render_start(month) == "Oktober 2026"

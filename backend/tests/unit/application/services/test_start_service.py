"""Unit-Tests fuer den deterministischen Start-Resolver.

Deckt den manuellen Override (`project.my_start_date`) ab: Datum, Ignore-Token
und Sofort-Marker. Ein Sofort-Marker (`asap`/`sofort`/...) unterdrueckt Text und
Formfeld wie ein Ignore-Token, liest sich aber als bewusst sofortiger Start.
Kein Datum wird je erfunden.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.application.services import start_service as application_start

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("token", ["asap", "ASAP", "sofort", "ab sofort", "kurzfristig"])
def test_is_immediate_token_returns_true_for_immediate_marker(token: str) -> None:
    """Sofort-Marker werden case-insensitiv und inklusive 'ab'-Praefix erkannt."""
    assert application_start.is_immediate_token(token) is True


@pytest.mark.parametrize("token", ["-", "nein", "01.10.2026", "10/2026", "Oktober 2026", ""])
def test_is_immediate_token_returns_false_for_non_immediate(token: str) -> None:
    """Ignore-Token, Datum und Freitext sind keine Sofort-Marker."""
    assert application_start.is_immediate_token(token) is False


def test_is_immediate_token_returns_false_for_none() -> None:
    """``None`` ist kein Sofort-Marker."""
    assert application_start.is_immediate_token(None) is False


def test_resolve_required_start_returns_none_for_manual_immediate_token() -> None:
    """Manuelles 'asap' liefert kein konkretes Datum (bewusst sofortig)."""
    result = application_start.resolve_required_start(
        text=None,
        field_value=None,
        manual="asap",
    )

    assert result is None


def test_resolve_required_start_manual_immediate_suppresses_text_and_field() -> None:
    """Manuelles 'asap' hat Vorrang und ueberschreibt Text- wie Felddatum."""
    result = application_start.resolve_required_start(
        text="Start: 01.10.2026",
        field_value="10/2026",
        manual="ab sofort",
    )

    assert result is None


def test_resolve_required_start_manual_date_wins_over_text_and_field() -> None:
    """Ein manuelles Datum schlaegt Text und Formfeld (Regression)."""
    result = application_start.resolve_required_start(
        text="Start: 01.10.2026",
        field_value="10/2026",
        manual="15.11.2026",
    )

    assert result is not None
    assert result.value == date(2026, 11, 15)
    assert result.precision == "day"
    assert result.source == application_start.SOURCE_MANUAL


def test_resolve_required_start_text_asap_without_manual_yields_no_date() -> None:
    """Ohne Override bleibt ein Text-'ASAP' ein sofortiger, datumsloser Start."""
    result = application_start.resolve_required_start(
        text="Start: ASAP",
        field_value="10/2026",
        manual=None,
    )

    assert result is None


def test_start_from_manual_returns_none_for_immediate_token() -> None:
    """``start_from_manual`` parst einen Sofort-Marker nicht als Datum."""
    assert application_start.start_from_manual("sofort") is None

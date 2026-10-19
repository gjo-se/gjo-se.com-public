"""Unit-Tests fuer die deterministische Onsite-/Remote-Aufloesung.

Deckt ``application_onsite`` (Textextraktion mit Vorrang vor dem Formfeld) und
die Verdrahtung in ``_remote_match`` ab: explizite Signale werden erkannt, fuzzy
Formulierungen liefern bewusst ``None`` (kein Raten).
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.application.domain import application_onsite_rules as application_onsite
from app.application.domain.application_score_hard_facts_rules import (
    _remote_match,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Arbeitsmodell: 90% remote, 10% vor Ort", 90),
        ("50 % remote / 50 % vor Ort (2 Tage die Woche)", 50),
        ("Einsatzort: Remote, 95% Homeoffice moeglich", 95),
        ("Remote/On-Site: Remote", 100),
        ("Remote/On-Site: onsite", 0),
        ("100 % Remote", 100),
        ("Fully remote position", 100),
        ("Vor-Ort-Anteil: ca. 1 Tag pro Woche", 80),
    ],
)
def test_remote_percent_from_text_detects_explicit_signals(text: str, expected: int) -> None:
    """Explizite Prozent-/Tage-Signale werden deterministisch erkannt."""
    assert application_onsite.remote_percent_from_text(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "Umfang: 4 Tage die Woche bei Vollzeitauslastung",
        "Remote mit gelegentlichen Abstimmungen vor Ort nach Bedarf",
        "Vereinzelte Praesenztermine nach Absprache",
        "",
    ],
)
def test_remote_percent_from_text_returns_none_without_numeric_signal(
    text: str,
) -> None:
    """Fuzzy/auslastungsbezogene Angaben liefern bewusst ``None`` (kein Raten)."""
    assert application_onsite.remote_percent_from_text(text) is None


def test_remote_percent_from_text_returns_none_for_none() -> None:
    """``None``-Eingabe ergibt ``None``."""
    assert application_onsite.remote_percent_from_text(None) is None


def test_resolve_prefers_text_over_field() -> None:
    """Der Ausschreibungstext hat Vorrang vor dem Formfeld."""
    percent, source = application_onsite.resolve_required_remote_percent(
        text="Arbeitsmodell: 60% remote / 40% vor Ort",
        field_percent=100,
    )
    assert percent == 60
    assert source == application_onsite.SOURCE_TEXT


def test_resolve_falls_back_to_field_without_text_signal() -> None:
    """Ohne Text-Signal greift das strukturierte Feld."""
    percent, source = application_onsite.resolve_required_remote_percent(
        text="Remote mit gelegentlichen Terminen vor Ort",
        field_percent=80,
    )
    assert percent == 80
    assert source == application_onsite.SOURCE_FIELD


def test_resolve_reports_none_when_both_sources_empty() -> None:
    """Ohne Text und Feld bleibt die Aufloesung leer."""
    percent, source = application_onsite.resolve_required_remote_percent(
        text=None,
        field_percent=None,
    )
    assert percent is None
    assert source == application_onsite.SOURCE_NONE


@pytest.mark.parametrize(
    ("percent", "expected"),
    [(0, True), (50, True), (99, True), (100, False), (None, False)],
)
def test_requires_onsite(percent: int | None, expected: bool) -> None:
    """Onsite-Zwang gilt genau dann, wenn die Remote-Quote unter 100 % liegt."""
    assert application_onsite.requires_onsite(percent) is expected


def test_remote_match_uses_text_over_conflicting_field() -> None:
    """Feld sagt 100 % Remote, Text fordert 2 Tage/Woche vor Ort -> Text gewinnt."""
    # Arrange
    project = SimpleNamespace(remote_percent=100)
    profile = SimpleNamespace(remote="Remote-first")

    # Act
    score = _remote_match(project, profile, "Muenchen, 2 Tage/Woche vor Ort")

    # Assert
    assert score.value == pytest.approx(0.6)
    assert "text" in score.reason
    assert "60%" in score.reason


def test_remote_match_keeps_full_value_for_field_only_remote() -> None:
    """Ohne Text-Signal und 100 % Feld-Remote bleibt der Wert voll."""
    # Arrange
    project = SimpleNamespace(remote_percent=100)
    profile = SimpleNamespace(remote="Remote-first")

    # Act
    score = _remote_match(project, profile, "Kein Hinweis auf Praesenz")

    # Assert
    assert score.value == pytest.approx(1.0)
    assert application_onsite.SOURCE_FIELD in score.reason

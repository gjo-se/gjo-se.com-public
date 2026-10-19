"""Unit-Tests fuer die deterministische Einsatzform-Aufloesung.

Deckt ``application_contract`` (Text > Feld, negationssicher, nur gelabelte
Text-Aussagen) und die Verdrahtung in ``_contract_match`` ab.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.application.domain import application_contract as ac
from app.application.domain.application_score_hard_facts_rules import (
    _contract_match,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("**Vertragsart:** ANÜ**", ac.NON_FREELANCE),
        ("Anstellungsart: Arbeitnehmerüberlassung", ac.NON_FREELANCE),
        ("Einsatzmodell: Arbeitnehmerüberlassung (ANÜ)", ac.NON_FREELANCE),
        ("Einsatzmodell Freelance – keine Festanstellung", ac.FREELANCE),
        ("Vertragsart: Freelance / Contracting-to-Perm", ac.FREELANCE),
        ("Vertragsart: freiberuflich (keine ANÜ)", ac.FREELANCE),
    ],
)
def test_detect_labeled_statement(text: str, expected: str) -> None:
    """Gelabelte Vertragsaussagen werden korrekt klassifiziert (negationssicher)."""
    assert ac.detect_contract_from_text(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        # Unlabeled passing mention (benefit), not the project's contract type.
        "Freiberufliche Auftraege koennen weiterhin flexibel angenommen werden.",
        # Negated (post-positioned) -> not freelance.
        "**Freelancer sind ausgeschlossen**",
        # Word boundary: "manueller" must NOT be read as ANÜ.
        "Erfahrung mit manueller Implementierung und manuellen Tests.",
        # No signal at all.
        "",
    ],
)
def test_detect_returns_none_without_labeled_signal(text: str) -> None:
    """Ohne gelabelte Aussage (oder nur negiert/beilaeufig) gibt es kein Signal."""
    assert ac.detect_contract_from_text(text) is None


def test_detect_whole_text_when_labeled_only_disabled() -> None:
    """Ohne Feld darf die Ganztext-Suche greifen (Fallback)."""
    text = "Wir suchen einen Freelancer fuer ein Contracting-Projekt."
    assert ac.detect_contract_from_text(text, labeled_only=False) == ac.FREELANCE


def test_resolve_text_label_overrides_conflicting_field() -> None:
    """Feld sagt contracting, Text sagt ANÜ -> Text gewinnt."""
    model, source = ac.resolve_required_contract(text="**Vertragsart:** ANÜ**", field="contracting")
    assert model == ac.NON_FREELANCE
    assert source == ac.SOURCE_TEXT


def test_resolve_falls_back_to_field_without_labeled_signal() -> None:
    """Ohne gelabelte Aussage entscheidet das strukturierte Feld."""
    model, source = ac.resolve_required_contract(
        text="Freiberufliche Auftraege koennen weiterhin angenommen werden.",
        field="employee_leasing",
    )
    assert model == ac.NON_FREELANCE
    assert source == ac.SOURCE_FIELD


def test_resolve_uses_whole_text_when_field_unknown() -> None:
    """Ohne Feld wird der Ganztext herangezogen."""
    model, source = ac.resolve_required_contract(
        text="Rahmen: Freelance, keine Arbeitnehmerueberlassung.",
        field=None,
    )
    assert model == ac.FREELANCE
    assert source == ac.SOURCE_TEXT


def test_resolve_reports_none_without_signal() -> None:
    """Ohne Text- und Feldsignal bleibt die Aufloesung leer."""
    model, source = ac.resolve_required_contract(text=None, field=None)
    assert model is None
    assert source == ac.SOURCE_NONE


def test_contract_match_text_overrides_field() -> None:
    """Feld contracting + Text 'Vertragsart: ANÜ' -> Wert 0.0."""
    project = SimpleNamespace(contract_type="contracting")
    score = _contract_match(project, "**Vertragsart:** ANÜ**")
    assert score.value == 0.0
    assert "text" in score.reason


def test_contract_match_keeps_field_without_labeled_signal() -> None:
    """Ohne gelabelte Aussage bleibt der Feldwert (contracting -> 1.0)."""
    project = SimpleNamespace(contract_type="contracting")
    score = _contract_match(project, "Kein Hinweis auf die Einsatzform.")
    assert score.value == 1.0
    assert ac.SOURCE_FIELD in score.reason

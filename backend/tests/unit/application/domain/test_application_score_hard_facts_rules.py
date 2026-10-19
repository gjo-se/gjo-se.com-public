"""Unit tests for the deterministic application-score hard facts.

Covers ``application_score_hard_facts_rules``: the five rule-based ``rahmen``
criteria (rate, start, remote, language, contract) computed without any LLM.
Focus is on the boundaries (rate tolerance bands), the "never guess" data-gap
semantics (``value=None`` with a concrete cause) and the negative/ambiguous
posting texts that must not produce a fabricated assessment.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.application.domain import application_score_hard_facts_rules as hard_facts
from app.application.domain.application_score_rubric_rules import (
    CriterionScore,
)

pytestmark = pytest.mark.unit


def _project(**overrides: object) -> SimpleNamespace:
    """Build a project double with the fields ``compute_hard_facts`` reads."""
    base: dict[str, object] = {
        "id": 1,
        "my_hourly_rate": None,
        "hourly_rate": None,
        "start_date": None,
        "my_start_date": None,
        "remote_percent": None,
        "contract_type": None,
        "description": None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _profile(**overrides: object) -> SimpleNamespace:
    """Build a profile double with the fields ``compute_hard_facts`` reads."""
    base: dict[str, object] = {"hourly_rate": None, "available_from": None, "remote": None, "languages": None}
    base.update(overrides)
    return SimpleNamespace(**base)


def _submission(**overrides: object) -> SimpleNamespace:
    """Build a submission double with the fields ``compute_hard_facts`` reads."""
    base: dict[str, object] = {"language": None}
    base.update(overrides)
    return SimpleNamespace(**base)


def _facts(
    project: SimpleNamespace,
    profile: SimpleNamespace,
    submission: SimpleNamespace,
    text: str = "",
) -> dict[str, CriterionScore]:
    """Run ``compute_hard_facts`` and index the result by criterion key."""
    scores = hard_facts.compute_hard_facts(
        project=project, profile=profile, submission=submission, ausschreibung_text=text
    )
    return {score.key: score for score in scores}


def test_compute_hard_facts_returns_the_five_rahmen_criteria_in_canon_order() -> None:
    """Exactly the five hard criteria are returned, in the canonical order."""
    scores = hard_facts.compute_hard_facts(
        project=_project(contract_type="contracting"),
        profile=_profile(remote="Remote", languages="de"),
        submission=_submission(language="de"),
        ausschreibung_text="100 % Remote, Vertragsart: freelance",
    )

    assert [score.key for score in scores] == [
        "rate_match",
        "start_match",
        "remote_match",
        "language_match",
        "contract_match",
    ]
    assert all(score.group == "rahmen" for score in scores)


@pytest.mark.parametrize(
    ("own_rate", "budget", "expected_value"),
    [
        # own <= budget → full
        (100, 100, 1.0),
        (80, 100, 1.0),
        # +10 % tolerance band edge (100 * 1.10 = 110) → near
        (110, 100, 0.7),
        (101, 100, 0.7),
        # +25 % tolerance band edge (100 * 1.25 = 125) → far
        (125, 100, 0.4),
        (111, 100, 0.4),
        # beyond +25 % → none
        (126, 100, 0.0),
    ],
)
def test_rate_match_tolerance_band_boundaries(own_rate: int, budget: int, expected_value: float) -> None:
    """The own rate is graded against the budget at the fixed tolerance borders."""
    facts = _facts(
        _project(my_hourly_rate=own_rate),
        _profile(),
        _submission(),
        text=f"{budget} €",
    )

    assert facts["rate_match"].value == pytest.approx(expected_value)


def test_rate_match_prefers_manual_project_rate_over_profile_rate() -> None:
    """A manually kept project rate wins over the profile fallback rate."""
    facts = _facts(_project(my_hourly_rate=100), _profile(hourly_rate=Decimal("200")), _submission(), text="100 €")

    assert facts["rate_match"].value == pytest.approx(1.0)
    assert "own rate 100" in (facts["rate_match"].reason or "")


def test_rate_match_uses_profile_rate_when_project_rate_missing() -> None:
    """Without a manual project rate the profile rate is the fallback."""
    facts = _facts(_project(), _profile(hourly_rate=Decimal("90")), _submission(), text="100 €")

    assert facts["rate_match"].value == pytest.approx(1.0)


def test_rate_match_without_own_rate_is_a_data_gap_with_profile_action() -> None:
    """A missing own rate yields ``None`` with the 'Profil ergänzen' action."""
    facts = _facts(_project(), _profile(), _submission(), text="100 €")

    assert facts["rate_match"].value is None
    assert facts["rate_match"].action == "Profil ergänzen"


def test_rate_match_without_budget_is_a_data_gap_without_action() -> None:
    """A missing budget yields ``None`` and no applicant-side action."""
    facts = _facts(_project(my_hourly_rate=100), _profile(), _submission(), text="Keine Gehaltsangabe")

    assert facts["rate_match"].value is None
    assert facts["rate_match"].action is None


def test_rate_match_budget_falls_back_to_project_estimate() -> None:
    """Without a text budget the project's estimated rate is used."""
    facts = _facts(_project(hourly_rate=100), _profile(hourly_rate=Decimal("100")), _submission(), text="ohne Preis")

    assert facts["rate_match"].value == pytest.approx(1.0)
    assert "project.hourly_rate" in (facts["rate_match"].reason or "")


def test_rate_match_ignores_implausible_budget_candidates() -> None:
    """Amounts outside the plausible hourly band do not count as a budget."""
    facts = _facts(_project(my_hourly_rate=100), _profile(), _submission(), text="Jahresgehalt 90000 €")

    assert facts["rate_match"].value is None
    assert facts["rate_match"].reason == "no budget in description/estimate"


def test_budget_range_contributes_its_upper_bound() -> None:
    """A ``80-100 €`` range is read at its upper bound."""
    facts = _facts(_project(my_hourly_rate=100), _profile(), _submission(), text="Budget: 80-100 €")

    assert facts["rate_match"].value == pytest.approx(1.0)


def test_start_match_full_when_available_before_required_start() -> None:
    """Being available before the required start yields the full value."""
    facts = _facts(
        _project(my_start_date="01.02.2026"),
        _profile(available_from=date(2026, 1, 1)),
        _submission(),
    )

    assert facts["start_match"].value == pytest.approx(1.0)
    assert facts["start_match"].action is None


def test_start_match_zero_when_available_after_required_start() -> None:
    """Being available after the required start yields zero with an action."""
    facts = _facts(
        _project(my_start_date="01.01.2026"),
        _profile(available_from=date(2026, 2, 1)),
        _submission(),
    )

    assert facts["start_match"].value == pytest.approx(0.0)
    assert facts["start_match"].action == "frühere Verfügbarkeit nennen"


def test_start_match_with_immediate_posting_start_is_a_data_gap() -> None:
    """An 'asap' posting start is not a concrete date and leaves the value empty."""
    facts = _facts(_project(), _profile(available_from=date(2026, 1, 1)), _submission(), text="Start: ASAP")

    assert facts["start_match"].value is None
    assert facts["start_match"].reason == "start date not parseable"


def test_start_match_without_availability_is_a_data_gap() -> None:
    """A parseable start without an availability date is a data gap."""
    facts = _facts(_project(my_start_date="01.02.2026"), _profile(), _submission())

    assert facts["start_match"].value is None
    assert facts["start_match"].action == "Profil ergänzen"


def test_remote_match_full_for_hybrid_affinity() -> None:
    """A hybrid affinity always matches the required remote share fully."""
    facts = _facts(_project(), _profile(remote="Hybrid, 2 Tage"), _submission(), text="40 % remote")

    assert facts["remote_match"].value == pytest.approx(1.0)


def test_remote_match_proportional_for_remote_affinity() -> None:
    """A remote affinity is graded by the required remote share."""
    facts = _facts(_project(), _profile(remote="Remote-first"), _submission(), text="80 % remote")

    assert facts["remote_match"].value == pytest.approx(0.8)


def test_remote_match_complements_percent_for_onsite_affinity() -> None:
    """An on-site affinity is graded by the required on-site share."""
    facts = _facts(_project(), _profile(remote="Vor Ort in Berlin"), _submission(), text="20 % remote")

    assert facts["remote_match"].value == pytest.approx(0.8)


def test_remote_match_without_required_share_is_a_data_gap() -> None:
    """Without a text/field signal the required share is unknown."""
    facts = _facts(_project(), _profile(remote="Remote-first"), _submission(), text="Kein Hinweis")

    assert facts["remote_match"].value is None
    assert facts["remote_match"].reason == "required remote share unknown (text/field)"


def test_remote_match_without_affinity_is_a_data_gap_with_profile_action() -> None:
    """A known required share without a profile affinity is a data gap."""
    facts = _facts(_project(), _profile(remote=None), _submission(), text="100 % Remote")

    assert facts["remote_match"].value is None
    assert facts["remote_match"].action == "Profil ergänzen"


def test_language_match_full_when_mail_language_equals_german_posting() -> None:
    """A German posting answered in German matches fully."""
    facts = _facts(
        _project(),
        _profile(languages="Deutsch, Englisch"),
        _submission(language="de"),
        text="Wir suchen einen Entwickler, der die Anwendung und das Team kennt.",
    )

    assert facts["language_match"].value == pytest.approx(1.0)
    assert facts["language_match"].action is None


def test_language_match_zero_when_mail_language_differs() -> None:
    """An English posting answered in German scores zero with an action."""
    facts = _facts(
        _project(),
        _profile(languages="English"),
        _submission(language="de"),
        text="We are looking for the developer and the team with the experience.",
    )

    assert facts["language_match"].value == pytest.approx(0.0)
    assert facts["language_match"].action == "Mail in en verfassen"


def test_language_match_unsupported_mail_language_is_a_data_gap() -> None:
    """A mail language outside {de, en} is a data gap."""
    facts = _facts(
        _project(),
        _profile(),
        _submission(language="fr"),
        text="Wir suchen einen Entwickler und das Team.",
    )

    assert facts["language_match"].value is None
    assert facts["language_match"].action == "Mail-Sprache setzen"


def test_language_match_undetectable_posting_language_is_a_data_gap() -> None:
    """A tie between German and English markers leaves the language unknown."""
    facts = _facts(_project(), _profile(), _submission(language="de"), text="the der")

    assert facts["language_match"].value is None
    assert facts["language_match"].reason == "posting language not detectable"


def test_contract_match_zero_for_labeled_non_freelance_statement() -> None:
    """A labeled ANÜ statement is a blocker and scores zero."""
    facts = _facts(_project(), _profile(), _submission(), text="**Vertragsart:** ANÜ**")

    assert facts["contract_match"].value == pytest.approx(0.0)


def test_contract_match_full_for_freelance_field() -> None:
    """A freelance structured field scores full."""
    facts = _facts(_project(contract_type="contracting"), _profile(), _submission(), text="Kein Hinweis")

    assert facts["contract_match"].value == pytest.approx(1.0)


def test_contract_match_unknown_engagement_is_a_data_gap() -> None:
    """Without a text or field signal the engagement type stays unknown."""
    facts = _facts(_project(), _profile(), _submission(), text="Kein Hinweis")

    assert facts["contract_match"].value is None

"""Unit tests for the localized CV story/experience mapping.

Maps the profile story and the active experiences to the Jinja-ready CV blocks
(``build_story`` / ``build_experiences``). Pure mapping – every assertion pins
the concrete German-translation output, no I/O and no database. ``company`` is
internal-only and must never appear in the mapped block.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest

from app.application.schemas.experience_schemas import (
    DecisionLocaleFieldsOut,
    DecisionOut,
    ExperienceLocaleFieldsOut,
    ExperienceOut,
    ProofLocaleFieldsOut,
    ProofOut,
)
from app.application.schemas.profile_schemas import ProfileLocaleFieldsOut, ProfileOut
from app.application.services import cv_experience_service

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)


def _profile(translations: dict[str, ProfileLocaleFieldsOut] | None = None) -> ProfileOut:
    """Build the singleton profile DTO with a given translation map."""
    return ProfileOut(
        id=1,
        full_name="Greg Erdmann",
        translations=translations or {},
        created_at=_NOW,
        updated_at=_NOW,
    )


def _experience(
    *,
    translations: dict[str, ExperienceLocaleFieldsOut] | None = None,
    decisions: list[DecisionOut] | None = None,
    proofs: list[ProofOut] | None = None,
    end_date: date | None = date(2021, 6, 30),
) -> ExperienceOut:
    """Build an experience DTO with a fixed period and optional child levels."""
    return ExperienceOut(
        id=1,
        application_profile_id=1,
        position="Data Engineer",
        company="Internal AG",
        project_url="https://proof.test/project",
        start_date=date(2020, 1, 1),
        end_date=end_date,
        sort=1,
        created_at=_NOW,
        updated_at=_NOW,
        translations=translations or {},
        decisions=decisions or [],
        proofs=proofs or [],
    )


def _german_blocks() -> dict[str, ExperienceLocaleFieldsOut]:
    """Return a full German translation map for the experience."""
    return {
        "de": ExperienceLocaleFieldsOut(
            context="Einordnung",
            outcome="Ergebnis",
            problem="Problem",
            scope="Umfang",
            solution_what="Lösung",
            tech_stack="Python, Kafka",
            evidence="Beleg",
        )
    }


def test_build_story_returns_the_german_translation() -> None:
    """The German story wins over other locales."""
    profile = _profile({"de": ProfileLocaleFieldsOut(story="DE"), "en": ProfileLocaleFieldsOut(story="EN")})

    assert cv_experience_service.build_story(profile) == "DE"


def test_build_story_falls_back_to_the_first_available_locale() -> None:
    """Without a German entry the first locale is used."""
    profile = _profile({"en": ProfileLocaleFieldsOut(story="EN")})

    assert cv_experience_service.build_story(profile) == "EN"


def test_build_story_returns_none_without_translations() -> None:
    """A profile without translations yields no story."""
    assert cv_experience_service.build_story(_profile()) is None


def test_build_experiences_maps_the_german_blocks_and_period() -> None:
    """Every Jinja block comes from the German translation; the period is formatted."""
    rows = [(_experience(translations=_german_blocks()), "active", "green")]

    experiences = cv_experience_service.build_experiences(rows)

    assert experiences == [
        {
            "position": "Data Engineer",
            "context": "Einordnung",
            "period": "01/2020 – 06/2021",
            "outcome": "Ergebnis",
            "problem": "Problem",
            "scope": "Umfang",
            "solution_what": "Lösung",
            "tech_stack": "Python, Kafka",
            "evidence": "Beleg",
            "decisions": [],
            "proofs": [],
            "project_url": "https://proof.test/project",
        }
    ]


def test_build_experiences_renders_an_open_end_as_heute() -> None:
    """An ongoing project (no end date) renders as ``MM/YYYY – heute``."""
    rows = [(_experience(translations=_german_blocks(), end_date=None), "active", "green")]

    experiences = cv_experience_service.build_experiences(rows)

    assert experiences[0]["period"] == "01/2020 – heute"


def test_build_experiences_localizes_decisions_and_proofs() -> None:
    """Decision and proof bullets use their own German translation maps."""
    decisions = [
        DecisionOut(
            id=1,
            sort=1,
            translations={"de": DecisionLocaleFieldsOut(title="Titel", body="Begründung", discarded="Verworfen")},
        )
    ]
    proofs = [ProofOut(id=1, sort=1, translations={"de": ProofLocaleFieldsOut(text="Beleg-Text")})]
    rows = [(_experience(translations=_german_blocks(), decisions=decisions, proofs=proofs), "active", "green")]

    experiences = cv_experience_service.build_experiences(rows)

    assert experiences[0]["decisions"] == [{"title": "Titel", "body": "Begründung", "discarded": "Verworfen"}]
    assert experiences[0]["proofs"] == [{"text": "Beleg-Text"}]


def test_build_experiences_falls_back_to_the_available_locale() -> None:
    """An experience with only an English entry maps the English text."""
    rows = [(_experience(translations={"en": ExperienceLocaleFieldsOut(context="context-en")}), "active", "green")]

    experiences = cv_experience_service.build_experiences(rows)

    assert experiences[0]["context"] == "context-en"


def test_build_experiences_returns_empty_for_no_rows() -> None:
    """No active experiences yield an empty CV list."""
    assert cv_experience_service.build_experiences([]) == []


def test_build_experiences_never_exposes_the_internal_company() -> None:
    """The internal ``company`` field is deliberately not mapped into the block."""
    rows = [(_experience(translations=_german_blocks()), "active", "green")]

    experiences = cv_experience_service.build_experiences(rows)

    assert "company" not in experiences[0]

"""Unit tests for the pure freelancermap.de AJAX payload mapping.

Every function is DB-free and side-effect-free, so behaviour is exercised
directly against raw payload dicts.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from app.fbf.constants import BASE_URL
from app.fbf.services import freelancermap_project_parser_service as parser

pytestmark = pytest.mark.unit


# ── map_project_identity ─────────────────────────────────────────────────────


def test_map_project_identity_builds_id_and_absolute_url_from_link() -> None:
    project = {"id": 123, "links": {"project": "/projekt/backend-python"}}

    assert parser.map_project_identity(project) == ("123", BASE_URL + "/projekt/backend-python")


def test_map_project_identity_falls_back_to_slug_without_link() -> None:
    project = {"id": 7, "links": {}, "slug": "daten-engineer"}

    assert parser.map_project_identity(project) == ("7", BASE_URL + "/projekt/daten-engineer")


def test_map_project_identity_returns_none_without_id() -> None:
    assert parser.map_project_identity({"links": {"project": "/projekt/x"}}) is None


def test_map_project_identity_returns_none_without_url() -> None:
    assert parser.map_project_identity({"id": 5, "links": {}}) is None


# ── map_project_details ──────────────────────────────────────────────────────


def test_map_project_details_maps_all_persisted_fields() -> None:
    project = {
        "title": "Backend Dev",
        "description": "<p>Hallo Welt</p>",
        "firstName": "Anna",
        "lastName": "Muster",
        "company": "Acme GmbH",
        "city": "  Berlin ",
        "country": {"nameDe": "Deutschland"},
        "projectContractType": {"remoteInPercent": 80, "type": "contracting"},
        "duration": 6,
        "beginningMonth": 5,
        "beginningYear": 2026,
        "skills": [{"en": "Python", "de": "Python"}, {"de": "Docker"}],
        "industry": {"nameDe": "IT"},
        "verlaengerung": True,
        "endcustomer": False,
    }

    fields = parser.map_project_details(project, "123", BASE_URL + "/projekt/backend-python")

    assert fields is not None
    assert fields.external_id == "123"
    assert fields.url == BASE_URL + "/projekt/backend-python"
    assert fields.title == "Backend Dev"
    assert fields.description == "Hallo Welt"
    assert fields.agency == "Acme GmbH"
    assert fields.contact_name == "Anna Muster"
    assert fields.city == "Berlin"
    assert fields.country == "Deutschland"
    assert fields.remote_percent == 80
    assert fields.contract_type == "contracting"
    assert fields.duration == 6
    assert fields.start_date == "5/2026"
    assert fields.industry == "IT"
    assert fields.extension_possible is True
    assert fields.endcustomer is False
    assert fields.skills_json == '["Python", "Docker"]'


def test_map_project_details_returns_none_without_title() -> None:
    assert parser.map_project_details({"title": ""}, "1", "url") is None


def test_map_project_details_leaves_optional_flags_unset() -> None:
    fields = parser.map_project_details({"title": "T"}, "1", "u")

    assert fields is not None
    assert fields.contact_name is None
    assert fields.skills_json is None
    assert fields.extension_possible is None
    assert fields.endcustomer is None


def test_map_project_details_keeps_null_remote_percent_when_contract_is_not_a_dict() -> None:
    fields = parser.map_project_details({"title": "T", "projectContractType": "freelance"}, "1", "u")

    assert fields is not None
    assert fields.remote_percent is None
    assert fields.contract_type is None


# ── normalize_skills ─────────────────────────────────────────────────────────


def test_normalize_skills_prefers_english_labels_and_dedupes() -> None:
    raw = {"0": {"en": "Python", "de": "Python"}, "1": {"de": "Docker"}, "2": {"en": "Python"}}

    assert parser.normalize_skills(raw) == ["Python", "Docker"]


def test_normalize_skills_accepts_a_list() -> None:
    assert parser.normalize_skills([{"en": "Go"}, {"de": "Rust"}]) == ["Go", "Rust"]


def test_normalize_skills_returns_empty_for_falsy_input() -> None:
    assert parser.normalize_skills(None) == []
    assert parser.normalize_skills([]) == []


def test_normalize_skills_ignores_values_without_labels() -> None:
    assert parser.normalize_skills(["Python", 42, {"foo": "bar"}]) == []


# ── parse_posted_at ──────────────────────────────────────────────────────────


def test_parse_posted_at_reads_iso_datetime_with_offset() -> None:
    parsed = parser.parse_posted_at("2026-04-21T11:40:17+02:00", "url")

    assert parsed == datetime.fromisoformat("2026-04-21T11:40:17+02:00")
    assert parsed is not None
    assert parsed.tzinfo is not None


def test_parse_posted_at_returns_none_for_non_string() -> None:
    assert parser.parse_posted_at(123, "url") is None


def test_parse_posted_at_returns_none_for_unparseable_string() -> None:
    assert parser.parse_posted_at("not-a-date", "url") is None

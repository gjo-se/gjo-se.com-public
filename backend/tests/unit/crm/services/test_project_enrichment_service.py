"""Unit tests for the pure helpers of the project-enrichment service.

Covers contact-name parsing (comma, title prefixes, multi-word last name,
single token, empty) and the company-kind mapping from the ``endcustomer``
flag, plus the first-wins Hunter-error recorder. No DB and no HTTP.
"""

from __future__ import annotations

import pytest

from app.crm.infrastructure.hunter_client import HunterError
from app.crm.services.project_enrichment_service import (
    _company_type_for_project,
    _is_title_prefix,
    _make_hunter_error_recorder,
    _parse_contact_name,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def test_parse_contact_name_comma_format_returns_first_and_last() -> None:
    """``"Lastname, Firstname"`` is split at the comma."""
    assert _parse_contact_name("Berntheisel, Stefan") == ("Stefan", "Berntheisel")


def test_parse_contact_name_comma_without_first_name_defaults_unknown() -> None:
    """A comma with an empty first part yields ``Unknown`` first name."""
    assert _parse_contact_name("Berntheisel,") == ("Unknown", "Berntheisel")


def test_parse_contact_name_strips_title_prefix() -> None:
    """A polite/title prefix is removed before parsing."""
    assert _parse_contact_name("Herr Stefan Berntheisel") == ("Stefan", "Berntheisel")
    assert _parse_contact_name("Dr. Maria Mustermann") == ("Maria", "Mustermann")


def test_parse_contact_name_multiword_last_name_is_kept_together() -> None:
    """Everything after the first token becomes the (multi-word) last name."""
    assert _parse_contact_name("Anna van der Berg") == ("Anna", "van der Berg")


def test_parse_contact_name_single_token_yields_unknown_last_name() -> None:
    """A single remaining token becomes the first name with ``Unknown`` last."""
    assert _parse_contact_name("Stefan") == ("Stefan", "Unknown")


def test_parse_contact_name_empty_yields_unknown_unknown() -> None:
    """An empty or prefix-only name yields two ``Unknown`` placeholders."""
    assert _parse_contact_name("") == ("Unknown", "Unknown")
    assert _parse_contact_name("Herr Dr.") == ("Unknown", "Unknown")


def test_is_title_prefix_ignores_dots_and_dashes() -> None:
    """``Dipl.-Ing.`` normalises to a known prefix; plain names do not."""
    assert _is_title_prefix("Dipl.-Ing.") is True
    assert _is_title_prefix("Stefan") is False


def test_company_type_for_project_maps_endcustomer_flag() -> None:
    """``True`` → endcustomer, ``False`` → broker, ``None`` → unknown."""
    assert _company_type_for_project(True) == "endcustomer"
    assert _company_type_for_project(False) == "broker"
    assert _company_type_for_project(None) is None


def test_make_hunter_error_recorder_keeps_only_first_error() -> None:
    """The recorder stores the first error code and message, ignoring later ones."""
    details: dict[str, bool | str] = {}
    record = _make_hunter_error_recorder(details)

    record(HunterError(code="insufficient_credits", detail="quota reached"))
    record(HunterError(code="unauthorized", detail="second"))

    assert details["hunter_error"] == "insufficient_credits"
    assert details["hunter_error_message"] == "quota reached"

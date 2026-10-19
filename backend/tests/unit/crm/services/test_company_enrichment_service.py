"""Unit tests for the pure mapping helpers of the company-enrichment flow.

Covers the enrichment-to-model mapping (fill-only, never overwrite), the
search-URL placeholder defaults, and the Hunter-error forwarding callback.
Instances are plain in-memory ``Company`` objects – no DB and no HTTP. The
mapping helpers live in the company repository (Achse-2: services stay
model-free); the error forwarding stays in the service.
"""

from __future__ import annotations

import pytest

from app.crm.infrastructure.hunter_client import CompanyEnrichmentData, HunterError
from app.crm.models.company import Company
from app.crm.repositories.company_repository import (
    _apply_company_search_url_defaults,
    _apply_enrichment,
)
from app.crm.services.company_enrichment_service import _report_hunter_error

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


class _FakeHunterClient:
    """Minimal client double exposing only ``last_error``."""

    def __init__(self, error: HunterError | None) -> None:
        self._error = error

    @property
    def last_error(self) -> HunterError | None:
        return self._error


def test_apply_enrichment_fills_empty_company_fields() -> None:
    """Empty company fields are filled from the enrichment data."""
    company = Company(name="Acme")
    enrichment = CompanyEnrichmentData(
        website="acme.test",
        industry="Software",
        company_size="11-50",
        founded_year=2015,
        linkedin_url="https://linkedin.com/company/acme",
    )

    _apply_enrichment(company, enrichment)

    assert company.website == "acme.test"
    assert company.industry == "Software"
    assert company.company_size == "11-50"
    assert company.founded_year == 2015
    assert company.linkedin_url == "https://linkedin.com/company/acme"


def test_apply_enrichment_never_overwrites_existing_values() -> None:
    """Existing company values always win over enrichment data."""
    company = Company(name="Acme", website="keep.test", industry="Handwerk")
    enrichment = CompanyEnrichmentData(website="new.test", industry="Software")

    _apply_enrichment(company, enrichment)

    assert company.website == "keep.test"
    assert company.industry == "Handwerk"


def test_apply_company_search_url_defaults_encodes_name_in_placeholders() -> None:
    """LinkedIn/Xing/Kununu search URLs are set with an URL-encoded name."""
    company = Company(name="Muster & Co")

    _apply_company_search_url_defaults(company)

    assert company.linkedin_url == "https://linkedin.com/search/results/companies/?keywords=Muster+%26+Co"
    assert company.xing_url == "https://www.xing.com/search/members?keywords=Muster+%26+Co"
    assert company.kununu_url == "https://www.kununu.com/de/search?q=Muster+%26+Co"


def test_apply_company_search_url_defaults_keeps_existing_urls() -> None:
    """An already-present profile URL is left untouched."""
    company = Company(name="Acme", linkedin_url="https://linkedin.com/company/acme")

    _apply_company_search_url_defaults(company)

    assert company.linkedin_url == "https://linkedin.com/company/acme"


def test_apply_company_search_url_defaults_is_noop_for_blank_name() -> None:
    """A blank company name produces no placeholder URLs."""
    company = Company(name="   ")

    _apply_company_search_url_defaults(company)

    assert company.linkedin_url is None
    assert company.xing_url is None
    assert company.kununu_url is None


def test_report_hunter_error_forwards_last_error_to_callback() -> None:
    """A handled Hunter failure is forwarded to the ``on_error`` callback."""
    error = HunterError(code="insufficient_credits", status_code=429, detail="quota")
    received: list[HunterError] = []

    _report_hunter_error(_FakeHunterClient(error), received.append)

    assert received == [error]


def test_report_hunter_error_is_silent_without_error_or_client() -> None:
    """No callback fires when the client has no error or is absent."""
    received: list[HunterError] = []

    _report_hunter_error(_FakeHunterClient(None), received.append)
    _report_hunter_error(None, received.append)
    _report_hunter_error(_FakeHunterClient(HunterError(code="api_error")), None)

    assert received == []

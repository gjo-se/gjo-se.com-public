"""Unit tests for the project-aware CV profile-header mapping.

``build_profile_context`` combines the profile facts with the project-aware
``Remote/Onsite`` value, the resolved availability and the quoted hourly rate
into the flat template dict. Pure formatting – every assertion pins a concrete
rendered value, no I/O and no database.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.application.schemas.profile_schemas import ProfileOut
from app.application.services import cv_profile_service, start_service

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)

#: Reference dates around the fixed "today" of the test run (2026-10-15).
_FUTURE = date(2030, 5, 1)
_PAST = date(2020, 1, 1)
_NEAR_FUTURE = date(2026, 12, 1)


def _profile(
    *,
    full_name: str = "Greg Erdmann",
    headline: str | None = "Senior AI Architect",
    remote: str | None = "Remote",
    hourly_rate: Decimal | None = None,
    hourly_rate_currency: str | None = None,
    available_from: date | None = None,
) -> ProfileOut:
    """Build the singleton profile DTO with the facts the header block reads."""
    return ProfileOut(
        id=1,
        full_name=full_name,
        headline=headline,
        remote=remote,
        hourly_rate=hourly_rate,
        hourly_rate_currency=hourly_rate_currency,
        available_from=available_from,
        created_at=_NOW,
        updated_at=_NOW,
    )


def _required_start(value: date, precision: str) -> start_service.RequiredStart:
    """Build a resolved required start with the fixed manual source tag."""
    return start_service.RequiredStart(value=value, precision=precision, source=start_service.SOURCE_MANUAL)


def test_build_profile_context_maps_core_profile_facts() -> None:
    """Name, remote fact and the freelance contract statement are mapped."""
    context = cv_profile_service.build_profile_context(_profile())

    assert context["full_name"] == "Greg Erdmann"
    assert context["headline"] == "Senior AI Architect"
    assert context["remote"] == "Remote"
    assert context["contract_type"] == "freiberuflich (kein ANÜ)"
    assert context["available_from"] is None
    assert context["hourly_rate"] is None


def test_build_profile_context_formats_an_integral_hourly_rate() -> None:
    """An integral rate renders without decimals and with the ISO currency."""
    context = cv_profile_service.build_profile_context(_profile(hourly_rate=Decimal("95")))

    assert context["hourly_rate"] == "95 EUR / Stunde"


def test_build_profile_context_formats_a_fractional_hourly_rate() -> None:
    """A fractional rate keeps two decimals."""
    context = cv_profile_service.build_profile_context(_profile(hourly_rate=Decimal("95.50")))

    assert context["hourly_rate"] == "95.50 EUR / Stunde"


def test_build_profile_context_prefers_the_project_rate() -> None:
    """A project-specific own rate overrides the profile default."""
    context = cv_profile_service.build_profile_context(_profile(hourly_rate=Decimal("95")), project_rate=110)

    assert context["hourly_rate"] == "110 EUR / Stunde"


def test_build_profile_context_quotes_chf_for_switzerland() -> None:
    """The project country Switzerland switches the quoted currency to CHF."""
    context = cv_profile_service.build_profile_context(_profile(hourly_rate=Decimal("95")), country="Schweiz")

    assert context["hourly_rate"] == "95 CHF / Stunde"


def test_build_profile_context_keeps_the_profile_currency_for_unknown_country() -> None:
    """An unmapped country keeps the profile's currency code."""
    context = cv_profile_service.build_profile_context(
        _profile(hourly_rate=Decimal("95"), hourly_rate_currency="USD"),
        country="Österreich",
    )

    assert context["hourly_rate"] == "95 USD / Stunde"


def test_build_profile_context_renders_on_request_values() -> None:
    """``on_request`` renders availability and rate as ``auf Anfrage``."""
    context = cv_profile_service.build_profile_context(
        _profile(hourly_rate=Decimal("95"), available_from=_FUTURE),
        on_request=True,
    )

    assert context["available_from"] == "auf Anfrage"
    assert context["hourly_rate"] == "auf Anfrage"


def test_build_profile_context_appends_an_onsite_clause_from_the_posting_text() -> None:
    """A posting requiring on-site presence appends Greg's on-site tolerance."""
    context = cv_profile_service.build_profile_context(_profile(), posting_text="2 Tage pro Woche vor Ort")

    assert context["remote"] == "Remote · onsite bis 1 Tag/Woche"


def test_build_profile_context_keeps_remote_for_a_fully_remote_posting() -> None:
    """A fully-remote posting keeps the base remote fact untouched."""
    context = cv_profile_service.build_profile_context(_profile(), posting_text="100% Remote")

    assert context["remote"] == "Remote"


def test_build_profile_context_appends_an_onsite_clause_from_the_field_percent() -> None:
    """Without a text signal the structured remote field drives the on-site clause."""
    context = cv_profile_service.build_profile_context(_profile(), posting_text=None, field_percent=0)

    assert context["remote"] == "Remote · onsite bis 1 Tag/Woche"


def test_build_profile_context_renders_a_reached_availability_as_sofort() -> None:
    """A profile availability already reached renders as the ATS keyword ``sofort``."""
    context = cv_profile_service.build_profile_context(_profile(available_from=_PAST))

    assert context["available_from"] == "sofort"


def test_build_profile_context_renders_a_future_availability_date() -> None:
    """A future profile availability renders as a concrete ``DD.MM.YYYY`` date."""
    context = cv_profile_service.build_profile_context(_profile(available_from=_FUTURE))

    assert context["available_from"] == "01.05.2030"


def test_build_profile_context_mirrors_a_later_required_start() -> None:
    """A posting start after the profile availability is mirrored verbatim."""
    context = cv_profile_service.build_profile_context(
        _profile(available_from=date(2026, 1, 1)),
        required_start=_required_start(date(2026, 3, 15), "day"),
    )

    assert context["available_from"] == "15.03.2026"


def test_build_profile_context_renders_a_month_precision_required_start() -> None:
    """A month-precision start renders as ``<Monat> <Jahr>``."""
    context = cv_profile_service.build_profile_context(
        _profile(available_from=date(2026, 1, 1)),
        required_start=_required_start(date(2026, 10, 1), "month"),
    )

    assert context["available_from"] == "Oktober 2026"


def test_build_profile_context_ignores_an_earlier_required_start() -> None:
    """A required start before the profile availability leaves the profile date governing."""
    context = cv_profile_service.build_profile_context(
        _profile(available_from=_NEAR_FUTURE),
        required_start=_required_start(date(2026, 3, 1), "day"),
    )

    assert context["available_from"] == "01.12.2026"


def test_build_profile_context_returns_none_without_a_profile_availability() -> None:
    """No profile availability and no required start yield ``None``."""
    context = cv_profile_service.build_profile_context(_profile(available_from=None))

    assert context["available_from"] is None

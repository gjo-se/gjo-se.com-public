"""Unit tests for the deterministic two-layer hourly-rate estimate.

``estimate_rate`` is a pure function (no DB, no LLM) – the LLM-independent core
of the ``project-hourly-rate`` canon. Cases are derived with equivalence classes
+ boundary values for the duration factor (2 / 3 / 6 / 7 months).
"""

from __future__ import annotations

import pytest

from app.fbf.schemas.project_schemas import ProjectRateEstimateOut
from app.fbf.services.project_rate_service import _parse_month_count, estimate_rate

pytestmark = pytest.mark.unit


def _estimate(
    *,
    base_rate: int = 100,
    country: str | None = "DE",
    endcustomer: bool | None = False,
    duration: str | None = "6 Monate",
    start_date: str | None = None,
    my_start_date: str | None = None,
) -> ProjectRateEstimateOut:
    """Call ``estimate_rate`` with neutral defaults, overriding selected fields."""
    return estimate_rate(
        base_rate=base_rate,
        country=country,
        endcustomer=endcustomer,
        duration=duration,
        start_date=start_date,
        my_start_date=my_start_date,
    )


# ── _parse_month_count (EP + boundary) ───────────────────────────────────────


@pytest.mark.parametrize(
    ("duration", "expected"),
    [
        ("6 Monate", 6),
        ("6-12 Monate", 12),
        ("3", 3),
        ("asap", None),
        ("", None),
        ("sofort", None),
    ],
)
def test_parse_month_count_extracts_largest_month_value(duration: str, expected: int | None) -> None:
    """Only recognisable month counts are parsed; the largest value wins."""
    assert _parse_month_count(duration) == expected


# ── estimate_rate: country factor (EP) ───────────────────────────────────────


@pytest.mark.parametrize(
    ("country", "expected_factor"),
    [("DE", 1.00), ("Schweiz", 1.25), ("Österreich", 0.95)],
)
def test_estimate_rate_applies_known_country_factor(country: str, expected_factor: float) -> None:
    """A known country contributes exactly one country factor."""
    country_factors = [factor for factor in _estimate(country=country).factors if factor.label == "Länderfaktor"]

    assert [factor.factor for factor in country_factors] == [expected_factor]


def test_estimate_rate_unknown_country_is_uncertainty() -> None:
    """An unknown country adds no factor but is flagged as an uncertainty."""
    result = _estimate(country="Atlantis")

    assert not [factor for factor in result.factors if factor.label == "Länderfaktor"]
    assert any("Atlantis" in note for note in result.uncertainties)


# ── estimate_rate: endcustomer factor (EP) ───────────────────────────────────


def test_estimate_rate_endcustomer_direct_applies_premium() -> None:
    """Direct end-customer allocation multiplies the rate by 1.30."""
    result = _estimate(endcustomer=True)
    factors = {factor.label: factor.factor for factor in result.factors}

    assert factors["Endkunde direkt"] == 1.30
    assert result.hourly_rate == 130


# ── estimate_rate: duration factor (BVA) ─────────────────────────────────────


@pytest.mark.parametrize(
    ("duration", "expected_factor"),
    [("2 Monate", 1.05), ("3 Monate", 1.00), ("6 Monate", 1.00), ("7 Monate", 0.95)],
)
def test_estimate_rate_applies_duration_factor_at_boundaries(duration: str, expected_factor: float) -> None:
    """Duration below 3 months is a premium, above 6 a discount (BVA edges)."""
    duration_factor = next(factor for factor in _estimate(duration=duration).factors if "Laufzeit" in factor.label)

    assert duration_factor.factor == expected_factor


# ── estimate_rate: immediate start + target-rate clamp ───────────────────────


def test_estimate_rate_immediate_start_marker_adds_factor() -> None:
    """A recognised immediate-start marker adds the 1.05 start factor."""
    result = _estimate(my_start_date="asap")

    assert any(factor.label == "Start sofort (≤ 4 Wochen)" and factor.factor == 1.05 for factor in result.factors)


def test_estimate_rate_target_never_below_base_rate() -> None:
    """The discount cap below the base rate is clamped by ``max(base, cap)``."""
    result = _estimate(base_rate=100, country="Österreich", endcustomer=False, duration="12 Monate")

    assert result.hourly_rate == 90
    assert result.target_rate == 100


def test_estimate_rate_zero_base_rate_yields_zero_deckel() -> None:
    """A zero base rate keeps the persisted cap at zero (no negative rates)."""
    result = _estimate(base_rate=0)

    assert result.hourly_rate == 0
    assert result.target_rate == 0

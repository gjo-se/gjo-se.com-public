"""Unit tests for the unified slug normalisation."""

from __future__ import annotations

import pytest

from app.shared.slugify.slugify import slugify

pytestmark = pytest.mark.unit


def test_slugify_none_or_empty_returns_empty_string() -> None:
    """None and empty input collapse to an empty slug."""
    assert slugify(None) == ""
    assert slugify("") == ""


def test_slugify_maps_german_umlauts_before_normalisation() -> None:
    """Umlauts and sharp-s are expanded (ä→ae, ö→oe, ü→ue, ß→ss)."""
    assert slugify("Größter Ärgernis") == "groesster-aergernis"
    assert slugify("Übung") == "uebung"


def test_slugify_collapses_non_alphanumeric_runs_to_single_dash() -> None:
    """Repeated separators and punctuation collapse into one dash."""
    assert slugify("Hello,   World!") == "hello-world"


def test_slugify_strips_leading_and_trailing_separators() -> None:
    """Leading/trailing separators are removed from the slug."""
    assert slugify("  --Risk High--  ") == "risk-high"


def test_slugify_truncates_to_max_length_without_trailing_dash() -> None:
    """Truncation at max_length removes a dash left at the cut edge."""
    assert slugify("abcdef", max_length=3) == "abc"
    assert slugify("ab cd", max_length=3) == "ab"


def test_slugify_keeps_text_shorter_than_max_length_unchanged() -> None:
    """A slug already within max_length is returned verbatim."""
    assert slugify("risk-high", max_length=100) == "risk-high"

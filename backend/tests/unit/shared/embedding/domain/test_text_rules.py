"""Unit tests for the shared embedding text-normalisation helper."""

from __future__ import annotations

import pytest

from app.shared.embedding.domain.text_rules import clean_str

pytestmark = pytest.mark.unit


def test_clean_str_returns_none_for_none_input() -> None:
    """None input stays None."""
    assert clean_str(None) is None


def test_clean_str_returns_none_for_blank_input() -> None:
    """Whitespace-only input collapses to None."""
    assert clean_str("   ") is None


def test_clean_str_strips_surrounding_whitespace() -> None:
    """A non-blank value is returned stripped."""
    assert clean_str("  monitoring  ") == "monitoring"

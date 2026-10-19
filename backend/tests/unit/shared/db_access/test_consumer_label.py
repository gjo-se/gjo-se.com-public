"""Unit tests for the DB consumer-label context variable."""

from __future__ import annotations

import pytest

from app.shared.db_access.consumer_label import get_consumer_label, set_consumer_label

pytestmark = pytest.mark.unit


def test_get_consumer_label_defaults_to_unknown_when_unset() -> None:
    """A fresh context reports the 'unknown' default label."""
    assert get_consumer_label() == "unknown"


def test_set_consumer_label_is_read_back_by_get() -> None:
    """A label set in the current context is returned verbatim."""
    set_consumer_label("restate:merge")

    assert get_consumer_label() == "restate:merge"

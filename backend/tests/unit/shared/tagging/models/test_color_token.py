"""Unit tests for the shared ColorToken enum."""

from __future__ import annotations

import pytest

from app.shared.tagging.models.color_token import ColorToken

pytestmark = pytest.mark.unit


def test_color_token_is_a_string_enum_with_gray() -> None:
    """ColorToken is a StrEnum whose gray value is the string 'gray'."""
    assert ColorToken.GRAY == "gray"
    assert isinstance(ColorToken.GRAY, str)


def test_color_token_rejects_unknown_value() -> None:
    """An unknown token value is rejected."""
    with pytest.raises(ValueError):
        ColorToken("magenta")

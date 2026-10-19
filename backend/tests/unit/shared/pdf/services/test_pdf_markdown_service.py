"""Unit tests for the PDF Markdown/HTML filter helpers."""

from __future__ import annotations

import pytest
from markupsafe import Markup

from app.shared.pdf.services.pdf_markdown_service import _md_bold, _paragraphs, _safe_html

pytestmark = pytest.mark.unit


def test_safe_html_marks_string_as_safe() -> None:
    """_safe_html wraps an already-escaped string as Markup."""
    result = _safe_html("&lt;b&gt;x&lt;/b&gt;")

    assert isinstance(result, Markup)
    assert str(result) == "&lt;b&gt;x&lt;/b&gt;"


def test_md_bold_escapes_then_bolds() -> None:
    """Input HTML is escaped before the **…** emphasis is applied."""
    assert str(_md_bold("**a** & <b>")) == "<strong>a</strong> &amp; &lt;b&gt;"


def test_paragraphs_splits_on_newline_after_escaping() -> None:
    """Newlines become paragraph breaks; HTML is escaped first."""
    assert str(_paragraphs("a\n<b>")) == "a</p><p>&lt;b&gt;"

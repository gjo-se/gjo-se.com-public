"""Markdown/HTML rendering helpers for PDF templates.

Provides the Jinja2 filters that convert the free Markdown/plain-text fields
(``story``, cover letter) into escaped HTML. Split out of
:mod:`app.shared.pdf.services.pdf_service` – rendering Markdown is a distinct
concern from template loading / PDF conversion.
"""

from __future__ import annotations

import re

from markupsafe import Markup, escape

#: Bold-only Markdown subset (``**…**`` → ``<strong>``). Deliberately minimal:
#: the CV story is free Markdown, but only emphasis is supported in the PDF.
_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


def _safe_html(escaped: str) -> Markup:
    """Mark an already-escaped string as safe HTML (single trusted boundary).

    Callers MUST escape every variable part via :func:`markupsafe.escape`
    before calling this. ``Markup`` then tells Jinja2 not to escape the
    intentional markup (``<strong>``, paragraph breaks) a second time.

    Args:
        escaped: HTML string whose variable parts are already escaped.

    Returns:
        The same string wrapped as :class:`markupsafe.Markup`.
    """
    return Markup(escaped)


def _md_bold(value: object | None) -> Markup:
    """Renders a bold-only Markdown subset to escaped HTML.

    Escapes the input first (no raw HTML injection), then converts every
    ``**text**`` pair to ``<strong>text</strong>``. Used for the free Markdown
    ``story`` field so the CV matches the website's Markdown rendering instead
    of showing literal ``**`` characters.

    Args:
        value: Raw Markdown text (``None`` renders as an empty string).

    Returns:
        Escaped HTML with ``**…**`` replaced by ``<strong>…</strong>``.
    """
    if value is None:
        return Markup("")
    escaped = str(escape(str(value)))
    return _safe_html(_BOLD_RE.sub(r"<strong>\1</strong>", escaped))


def _paragraphs(value: object | None) -> Markup:
    """Renders free multi-line text as escaped HTML paragraphs.

    Escapes the input first (no raw HTML injection), then turns every newline
    into a ``</p><p>`` break so a cover letter keeps its paragraph structure.

    Args:
        value: Raw multi-line text (``None`` renders as an empty string).

    Returns:
        Escaped HTML with newlines replaced by paragraph breaks.
    """
    if value is None:
        return Markup("")
    escaped = str(escape(str(value)))
    return _safe_html(escaped.replace("\n", "</p><p>"))

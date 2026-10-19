"""Unit tests for the PDF service helpers and template lookup."""

from __future__ import annotations

import sys
from types import SimpleNamespace
from typing import Any

import pytest

from app.shared.pdf.services import pdf_service as svc
from app.shared.pdf.services.pdf_markdown_service import _md_bold, _paragraphs
from app.shared.pdf.services.pdf_service import _list_available_templates, generate_pdf

pytestmark = pytest.mark.unit


def test_md_bold_escapes_html_before_applying_emphasis() -> None:
    """The bold filter escapes raw HTML and only then converts **…** to <strong>."""
    assert str(_md_bold("**bold**")) == "<strong>bold</strong>"
    assert str(_md_bold("<script>alert(1)</script>")) == "&lt;script&gt;alert(1)&lt;/script&gt;"


def test_md_bold_renders_none_as_empty_string() -> None:
    """None renders as an empty string."""
    assert str(_md_bold(None)) == ""


def test_paragraphs_escapes_and_splits_on_newlines() -> None:
    """Newlines become paragraph breaks after escaping."""
    result = str(_paragraphs("a\nb"))

    assert result == "a</p><p>b"


async def test_generate_pdf_missing_template_raises_file_not_found() -> None:
    """An unknown template raises FileNotFoundError listing available templates."""
    with pytest.raises(FileNotFoundError, match="nicht gefunden"):
        await generate_pdf("does-not-exist", {})


# ── template listing / render + conversion (fakes) ───────────────────────────


def test_list_available_templates_lists_sorted_stems(tmp_path: Any) -> None:
    (tmp_path / "cv.html.jinja2").write_text("x")
    (tmp_path / "invoice.html.jinja2").write_text("x")

    assert _list_available_templates(tmp_path) == "cv, invoice"


def test_list_available_templates_empty_directory(tmp_path: Any) -> None:
    assert _list_available_templates(tmp_path) == "(keine)"


class _Env:
    def __init__(self, template: Any) -> None:
        self._template = template
        self.requested: str | None = None

    def get_template(self, name: str) -> Any:
        self.requested = name
        return self._template


@pytest.mark.asyncio
async def test_generate_pdf_renders_and_converts(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    """The template renders and the HTML is converted with the template base URL."""
    captured: dict[str, Any] = {}

    class _Template:
        def render(self, **data: Any) -> str:
            captured["data"] = data
            return "<html>ok</html>"

    class _FakeHTML:
        def __init__(self, **kw: Any) -> None:
            captured.update(kw)

        def write_pdf(self) -> bytes:
            return b"%PDF-1.4"

    monkeypatch.setitem(sys.modules, "weasyprint", SimpleNamespace(HTML=_FakeHTML))

    out = await svc.generate_pdf(
        "cv",
        {"title": "T"},
        templates_dir=tmp_path,
        env=_Env(_Template()),
    )

    assert out == b"%PDF-1.4"
    assert captured["string"] == "<html>ok</html>"
    assert captured["base_url"] == str(tmp_path) + "/"
    assert captured["data"] == {"title": "T"}


@pytest.mark.asyncio
async def test_generate_pdf_render_failure_raises_value_error(tmp_path: Any) -> None:
    """A template render error is wrapped into a ValueError."""

    class _Template:
        def render(self, **_data: Any) -> str:
            raise RuntimeError("render boom")

    with pytest.raises(ValueError, match="beim Rendern"):
        await svc.generate_pdf("cv", {}, templates_dir=tmp_path, env=_Env(_Template()))


@pytest.mark.asyncio
async def test_generate_pdf_conversion_failure_raises_value_error(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    """A WeasyPrint failure is wrapped into a ValueError."""

    class _Template:
        def render(self, **_data: Any) -> str:
            return "<html></html>"

    class _FakeHTML:
        def __init__(self, **_kw: Any) -> None:
            return None

        def write_pdf(self) -> bytes:
            raise RuntimeError("pdf boom")

    monkeypatch.setitem(sys.modules, "weasyprint", SimpleNamespace(HTML=_FakeHTML))

    with pytest.raises(ValueError, match="PDF-Konvertierung"):
        await svc.generate_pdf("cv", {}, templates_dir=tmp_path, env=_Env(_Template()))

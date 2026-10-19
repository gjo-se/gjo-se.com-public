"""PDF generation service – Jinja2 + WeasyPrint.

Provides a generic ``generate_pdf`` function that renders a named Jinja2
template with the supplied context data and returns the resulting PDF as
raw bytes. The Markdown/HTML filters live in :mod:`pdf_markdown`.
"""

from pathlib import Path
from typing import Any

import structlog
from jinja2 import Environment, FileSystemLoader, TemplateNotFound

from app.shared.pdf.services.pdf_markdown_service import _md_bold, _paragraphs

logger = structlog.get_logger(__name__)

_TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates"


_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=True,
)
_jinja_env.filters["md_bold"] = _md_bold
_jinja_env.filters["paragraphs"] = _paragraphs


async def generate_pdf(
    template_name: str,
    data: dict[str, Any],
    *,
    templates_dir: Path | None = None,
    env: Any | None = None,
) -> bytes:
    """Render a named Jinja2 template with data and convert to PDF.

    Args:
        template_name: Template base name without extension
            (e.g. ``"cv"`` → ``cv.html.jinja2``).
        data: Context dictionary passed to the template as keyword
            arguments.
        templates_dir: Optional template directory override (tests/injection).
        env: Optional Jinja2 environment override (tests/injection).

    Returns:
        Raw PDF bytes suitable for a ``FileResponse``.

    Raises:
        FileNotFoundError: If the template file does not exist.
        ValueError: If template rendering or PDF conversion fails.
    """
    template_file = f"{template_name}.html.jinja2"
    directory = templates_dir or _TEMPLATES_DIR
    jinja_env = env or _jinja_env

    try:
        template = jinja_env.get_template(template_file)
    except TemplateNotFound as exc:
        logger.warning("PDF template not found: %s", template_file)
        raise FileNotFoundError(
            f"Template '{template_name}' nicht gefunden. Verfügbare Templates: {_list_available_templates(directory)}"
        ) from exc

    try:
        html_content = template.render(**data)
    except Exception as exc:
        logger.error("Template rendering failed for '%s': %s", template_name, exc)
        raise ValueError(f"Fehler beim Rendern des Templates '{template_name}': {exc}") from exc

    try:
        from weasyprint import HTML  # Lazy: native deps needed only at render time

        pdf_bytes = HTML(
            string=html_content,
            base_url=str(directory) + "/",
        ).write_pdf()
    except Exception as exc:
        logger.error("PDF conversion failed for '%s': %s", template_name, exc)
        raise ValueError(f"Fehler bei der PDF-Konvertierung für '{template_name}': {exc}") from exc

    if pdf_bytes is None:  # pragma: no cover – WeasyPrint liefert immer Bytes
        raise ValueError(f"PDF-Konvertierung für '{template_name}' lieferte keine Daten.")

    logger.info(
        "PDF generated from template '%s' (%d bytes)",
        template_name,
        len(pdf_bytes),
    )
    return pdf_bytes


def _list_available_templates(directory: Path | None = None) -> str:
    """Return a comma-separated list of available template names."""
    base = directory or _TEMPLATES_DIR
    try:
        names = [p.stem.replace(".html", "") for p in base.glob("*.html.jinja2")]
        return ", ".join(sorted(names)) if names else "(keine)"
    except OSError:
        return "(Verzeichnis nicht lesbar)"

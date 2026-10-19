"""Pydantic schemas for PDF generation requests."""

from typing import Any

from pydantic import BaseModel, Field


class PdfGenerateRequest(BaseModel):
    """Request body for the generic PDF generation endpoint.

    The ``data`` dict is passed directly to the Jinja2 template context.
    Its structure depends on the template:

    - ``cv``: expects ``profile`` (``full_name``, ``headline``, ``email``,
      ``phone``, ``location``, ``website_url``, ``github_url``,
      ``linkedin_url``), ``story``, ``career_entries`` (``position``,
      ``company``, ``start_date``, ``end_date``, ``description``),
      ``focus_areas`` (``title``, ``summary``, ``url``), ``skills``
      (``name``), ``skills_radar`` (``name``, ``importance``,
      ``level_public``), the pre-rendered inline-SVG string ``radar_svg`` and
      ``languages`` plus optional ``project``. All keys are optional –
      missing keys make the section disappear.
    - ``cover_letter``: expects ``profile``, ``project``, ``career_entries``
    """

    template_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Template name without extension (e.g. 'cv' or 'cover_letter')",
    )
    data: dict[str, Any] = Field(
        default_factory=dict,
        description="Template context data – passed to Jinja2 as keyword arguments",
    )

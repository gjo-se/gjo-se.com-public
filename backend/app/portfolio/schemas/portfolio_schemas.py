"""Pydantic schemas for the portfolio API (gjo_se_com).

Combines the admin write DTOs (translation-table pattern) and the public read
DTOs.

Admin (``portfolio_in``):
    The admin write API uses the translation-table pattern: structure fields
    (slug, link_url, link_label, year, sort) and localized DE/EN content are
    carried in a single request body. ``LocaleFieldsOut`` holds the localized
    fields for one locale; ``translations`` is a ``dict[str, LocaleFieldsOut]``
    keyed by locale (``de`` required, further locales optional).

Public (``portfolio_out``):
    Read-only list/detail DTOs with localized text fields.
"""

from pydantic import BaseModel, Field


class LocaleFieldsOut(BaseModel):
    """Localized text fields for one portfolio translation (per locale).

    ``title`` is required for every locale row; ``sub_title``, ``teaser`` and
    ``impact_summary`` are optional and stored as-is.
    """

    title: str = Field(..., min_length=1, max_length=200)
    sub_title: str | None = Field(default=None, max_length=200)
    teaser: str | None = Field(default=None, max_length=200)
    impact_summary: str | None = Field(default=None, max_length=500)


class PortfolioAdminCreate(BaseModel):
    """Request body for creating a portfolio project with translations.

    ``translations`` maps a locale to its localized fields and must contain at
    least ``de``. The slug is normalized via ``slugify`` on the service layer.
    """

    slug: str = Field(..., min_length=1, max_length=100)
    image: str | None = Field(default=None, max_length=500, description="Hero-/Teaser-Bild (Storage-Key)")
    link_url: str | None = Field(default=None, max_length=500)
    link_label: str | None = Field(default=None, max_length=200)
    year: str | None = Field(default=None, max_length=20)
    sort: int = 0
    translations: dict[str, LocaleFieldsOut] = Field(
        ...,
        description="locale → Feldwerte, mind. 'de'",
    )


class PortfolioAdminUpdate(BaseModel):
    """Request body for partially updating a portfolio project.

    All fields are optional – only provided fields are updated. When
    ``translations`` is provided, the existing translation rows are replaced
    with the new set (translation-table pattern).
    """

    slug: str | None = Field(default=None, min_length=1, max_length=100)
    image: str | None = Field(default=None, max_length=500, description="Hero-/Teaser-Bild (Storage-Key)")
    link_url: str | None = Field(default=None, max_length=500)
    link_label: str | None = Field(default=None, max_length=200)
    year: str | None = Field(default=None, max_length=20)
    sort: int | None = None
    translations: dict[str, LocaleFieldsOut] | None = Field(
        default=None,
        description="locale → Feldwerte, mind. 'de' wenn gesetzt",
    )


class PortfolioAdminOut(BaseModel):
    """Serialized portfolio project for the admin CRUD API.

    Structure fields plus all localized translations as
    ``dict[str, LocaleFieldsOut]`` keyed by locale (all rows, not flattened).
    ``status``/``status_color_token`` werden via ``core_statusable`` aufgelöst
    (StatusableType.PORTFOLIO) und sind nur befüllt, wenn die Auflösung
    gelaufen ist – sonst None.
    """

    id: int
    slug: str
    image: str | None = None
    link_url: str | None = None
    link_label: str | None = None
    year: str | None = None
    sort: int = 0
    status: str | None = None
    status_color_token: str | None = None
    translations: dict[str, LocaleFieldsOut]


class PortfolioReorderRequest(BaseModel):
    """Request body for batch-reordering portfolio projects.

    ``ordered_slugs`` lists the portfolio slugs in desired order; the list
    index becomes the portfolio's ``sort`` value.
    """

    ordered_slugs: list[str] = Field(..., min_length=1)


class PortfolioTranslationUpdate(BaseModel):
    """Partial update payload for one portfolio translation (per locale).

    All fields are optional – only provided fields are updated on the locale
    row. ``title`` is required on the persisted row: setting it to ``None`` or
    an empty string keeps the existing value (a locale row always needs a
    title).
    """

    title: str | None = Field(default=None, max_length=200)
    sub_title: str | None = Field(default=None, max_length=200)
    teaser: str | None = Field(default=None, max_length=200)
    impact_summary: str | None = Field(default=None, max_length=500)


class PortfolioListItemOut(BaseModel):
    """Serialized portfolio card for the public list endpoint.

    Text fields are localized (requested locale, falling back to German).
    ``image`` is the project's own hero/teaser image (Storage-Key), otherwise
    None. It is independent of the proof images.
    """

    slug: str
    title: str
    sub_title: str | None = None
    teaser: str | None = None
    impact_summary: str | None = None
    year: str | None = None
    image: str | None = None


class PortfolioPublicOut(BaseModel):
    """Serialized portfolio detail for the public detail endpoint.

    Header fields, all localized (requested locale, falling back to German).
    Fields are flat – no translation nesting. ``image`` is the project's own
    hero image (Storage-Key), otherwise None.
    """

    slug: str
    title: str
    sub_title: str | None = None
    impact_summary: str | None = None
    year: str | None = None
    image: str | None = None
    link_url: str | None = None
    link_label: str | None = None


__all__ = [
    "LocaleFieldsOut",
    "PortfolioAdminCreate",
    "PortfolioAdminOut",
    "PortfolioAdminUpdate",
    "PortfolioListItemOut",
    "PortfolioPublicOut",
    "PortfolioReorderRequest",
    "PortfolioTranslationUpdate",
]

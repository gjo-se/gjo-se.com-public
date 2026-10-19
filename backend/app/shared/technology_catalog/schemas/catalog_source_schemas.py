"""Pydantic schemas for external catalog source responses – 1:1 mapping of the catalog technology JSON."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CatalogSourceTechnologyOut(BaseModel):
    """1:1 mapping of an external catalog technology entry from the catalog endpoint.

    All fields mirror the JSON schema of the configured catalog source endpoint
    (see ``TECHNOLOGY_CATALOG_BASE_URL``).

    Note:
        ``from_attributes`` is ``False`` – these schemas do not map an ORM.
    """

    id: str
    slug: str | None = None
    defaultSlug: str | None = None
    slugs: list[str] | None = None
    name: str
    nameShort: str | None = None
    provider: str | None = None
    type: str | None = None
    color: str | None = None
    restrictions: list[str] | None = None
    description: str | None = None
    websiteUrl: str | None = None
    docsUrl: str | None = None
    status: str | None = None
    deprecatedAt: str | None = None
    deletedAt: str | None = None
    disabled: bool = False
    iconUrlDark: str | None = None
    iconUrlLight: str | None = None


class CatalogSourcePageResponse(BaseModel):
    """Wrapper for a paginated catalog source response.

    Attributes:
        data: List of technology entries on the current page.
        nextCursor: Cursor for the next page; ``None`` = last page.
    """

    model_config = ConfigDict(populate_by_name=True)

    data: list[CatalogSourceTechnologyOut] = Field(validation_alias="catalogTechnologies")
    nextCursor: str | None = None

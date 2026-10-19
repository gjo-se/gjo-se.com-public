"""Pydantic schemas for technology_catalog – Request/Response contracts for Technology API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TechnologyIconResponse(BaseModel):
    """Icon metadata for a technology entry including computed URLs.

    Attributes:
        id: DB primary key.
        variant: Icon variant, e.g. ``dark`` or ``light``.
        storage_key: ObjectStore key for the PNG file.
        downloaded_at: Timestamp when the PNG was downloaded.
        file_size: Size of the PNG file in bytes.
        svg_storage_key: ObjectStore key for the SVG file.
        svg_downloaded_at: Timestamp when the SVG was downloaded.
        svg_file_size: Size of the SVG file in bytes.
        icon_url: Computed URL – SVG preferred, PNG fallback.
    """

    id: int
    variant: str
    storage_key: str | None = None
    downloaded_at: datetime | None = None
    file_size: int | None = None
    svg_storage_key: str | None = None
    svg_downloaded_at: datetime | None = None
    svg_file_size: int | None = None
    icon_url: str | None = None

    model_config = {"from_attributes": True}


class TechnologyResponse(BaseModel):
    """Full response for a technology entry including resolved icons and status.

    Attributes:
        id: DB primary key.
        slug: URL-friendly unique identifier.
        name: Human-readable technology name.
        name_short: Abbreviated name (max 50 chars).
        provider: Vendor or organization name.
        type: Technology classification, e.g. ``database``, ``framework``.
        color_token: CSS color token for diagram rendering.
        viscera_restrictions: List of Viscera diagram IDs where this tech is restricted.
        description: Free-text description.
        website_url: Link to the technology homepage.
        docs_url: Link to official documentation.
        created_at: Row creation timestamp.
        updated_at: Last modification timestamp.
        status: Current status name from core_status (via core_statusable JOIN).
        status_color_token: Color token from core_status (green/amber/orange).
        icons: Resolved list of technology icons.
    """

    id: int
    slug: str
    slugs: list[str] | None = None
    name: str
    name_short: str | None = None
    provider: str | None = None
    type: str | None = None
    color_token: str
    viscera_restrictions: list[str] | None = None
    description: str | None = None
    website_url: str | None = None
    docs_url: str | None = None
    created_at: datetime
    updated_at: datetime
    status: str | None = None
    status_color_token: str | None = None
    icons: list[TechnologyIconResponse] = []

    model_config = {"from_attributes": True}


class TechnologyPatchIn(BaseModel):
    """Partial update payload – all writable fields are optional.

    Only provided fields are applied; omitted fields keep their current value.
    """

    slug: str | None = None
    slugs: list[str] | None = None
    name: str | None = None
    name_short: str | None = None
    provider: str | None = None
    type: str | None = None
    color_token: str | None = None
    viscera_restrictions: list[str] | None = None
    description: str | None = None
    website_url: str | None = None
    docs_url: str | None = None

    model_config = {"from_attributes": True}


class TechnologyListCountResponse(BaseModel):
    """Wrapper for count endpoint – total number of matching technologies."""

    total: int

    model_config = {"from_attributes": True}


class TechnologySyncResultOut(BaseModel):
    """Result of a catalog sync run with counts for each operation type.

    Attributes:
        created: Number of newly inserted technologies.
        updated: Number of existing technologies with changed fields.
        unchanged: Number of existing technologies with no changes.
        errors: Number of individual entry processing errors.
        deprecated: Number of entries marked as deprecated (no longer in the source catalog).
        embedded: Number of technologies with newly generated embeddings.
    """

    created: int = 0
    updated: int = 0
    unchanged: int = 0
    errors: int = 0
    deprecated: int = 0
    embedded: int = 0


class IconDownloadResultOut(BaseModel):
    """Result of an icon download batch with per-category counts.

    Attributes:
        downloaded: Number of PNGs successfully downloaded.
        failed: Number of icons where download or processing failed.
        svg_converted: Number of SVGs successfully created and saved.
        svg_skipped: Number of SVGs discarded due to quality check failure.
        drained: ``True`` if the queue was completely emptied, ``False`` if the
            time limit was reached before all icons could be processed.
    """

    downloaded: int = 0
    failed: int = 0
    svg_converted: int = 0
    svg_skipped: int = 0
    drained: bool = False

"""Icon-record creation for the external-catalog → catalog sync (gjo_se_com).

Owns the dark/light ``TechnologyIcon`` creation and the catalog icon-URL
extraction. Split out of ``technology_sync_repository`` so that module stays
cohesive (LCOM4): the icon cluster shares no collaborator with the status or
upsert clusters.
"""

from __future__ import annotations

import re

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.technology_catalog.models.technology_icon import TechnologyIcon
from app.shared.technology_catalog.schemas.catalog_source_schemas import CatalogSourceTechnologyOut

logger = structlog.get_logger(__name__)

_ICON_URL_PATTERN = re.compile(r"/(?:dark|light)/([a-zA-Z0-9_-]+)")


async def ensure_icons(
    db: AsyncSession,
    technology_id: int,
    entry: CatalogSourceTechnologyOut,
) -> None:
    """Create TechnologyIcon records for dark + light variants if not already present.

    Checks existing variants for the technology to avoid duplicates.
    New icon records have ``downloaded_at = NULL`` (download in Increment 4).
    """
    existing_result = await db.execute(
        select(TechnologyIcon.variant).where(
            TechnologyIcon.core_technology_catalog_id == technology_id,
        )
    )
    existing_variants = set(existing_result.scalars().all())

    variants: list[tuple[str, str | None]] = [
        ("dark", entry.iconUrlDark),
        ("light", entry.iconUrlLight),
    ]

    for variant, url in variants:
        if variant in existing_variants:
            continue
        icon_external_id = _extract_icon_external_id(url)
        if icon_external_id is None:
            continue
        db.add(
            TechnologyIcon(
                core_technology_catalog_id=technology_id,
                variant=variant,
                icon_external_id=icon_external_id,
                downloaded_at=None,
            )
        )


def _extract_icon_external_id(url: str | None) -> str | None:
    """Extract the icon ID from a catalog icon URL.

    Pattern: ``{icon-cdn}/{variant}/{id}.png`` (CDN base from config).
    """
    if url is None:
        return None
    match = _ICON_URL_PATTERN.search(url)
    if match is None:
        logger.warning("Could not extract icon ID from URL: %s", url)
        return None
    return match.group(1)

"""Database access for the icon downloader (shared technology_catalog).

Holds the pending-icon SELECT builder, the icon loaders, the metadata writers and
the session factory. Extracted from ``icon_downloader_service`` so the service
stays query-free (Achse 2: ``services`` > ``repositories``; K1/K2/K3). Read
functions return domain records; the service orchestrates and hands the records
back for persistence.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.sql import func

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.technology_catalog.domain.technology_catalog_contract import (
    IconDownloadRecord,
    IconFailureRecord,
)
from app.shared.technology_catalog.models.technology_icon import TechnologyIcon

__all__ = [
    "MAX_RETRIES",
    "AsyncSessionLocal",
    "build_select_query",
    "load_icon",
    "load_icon_with_technology",
    "save_failure",
    "save_png",
    "save_svg",
]

#: Maximum download attempts before an icon is skipped permanently.
MAX_RETRIES = 5
#: Cooldown (minutes) before a failed icon is retried.
RETRY_COOLDOWN_MINUTES = 60


def build_select_query(limit: int):
    """Builds the SELECT for pending icon ids (PK only, see service rationale).

    Only the primary key is fetched; each icon is reloaded fresh in the service
    before processing, because a failed icon triggers ``db.rollback()`` which
    expires every object currently in the session.
    """
    return (
        select(TechnologyIcon.id)
        .where(
            TechnologyIcon.downloaded_at.is_(None),
            TechnologyIcon.retry_count < MAX_RETRIES,
            or_(
                TechnologyIcon.last_attempt_at.is_(None),
                TechnologyIcon.last_attempt_at < func.now() - text(f"INTERVAL '{RETRY_COOLDOWN_MINUTES} minutes'"),
            ),
        )
        .limit(limit)
    )


async def load_icon_with_technology(db: AsyncSession, icon_id: int) -> IconDownloadRecord | None:
    """Loads an icon with its technology as a download record, or ``None``."""
    icon = await db.get(TechnologyIcon, icon_id, options=[joinedload(TechnologyIcon.technology)])
    if icon is None:
        return None
    tech = icon.technology
    slug = tech.slug or str(tech.id)
    return IconDownloadRecord(
        id=icon.id,
        variant=icon.variant,
        icon_external_id=icon.icon_external_id,
        slug=slug,
    )


async def load_icon(db: AsyncSession, icon_id: int) -> IconFailureRecord | None:
    """Loads the failure-tracking projection of an icon, or ``None`` when gone."""
    icon = await db.get(TechnologyIcon, icon_id)
    if icon is None:
        return None
    return IconFailureRecord(id=icon.id, retry_count=icon.retry_count)


async def save_png(
    db: AsyncSession,
    icon_id: int,
    *,
    storage_key: str,
    downloaded_at: datetime,
    file_size: int,
    content_hash: str,
) -> None:
    """Persists the downloaded PNG metadata onto the icon and commits."""
    icon = await db.get(TechnologyIcon, icon_id)
    if icon is None:
        return
    icon.storage_key = storage_key
    icon.downloaded_at = downloaded_at
    icon.file_size = file_size
    icon.content_hash = content_hash
    await db.commit()


async def save_svg(
    db: AsyncSession,
    icon_id: int,
    *,
    svg_storage_key: str,
    svg_downloaded_at: datetime,
    svg_file_size: int,
) -> None:
    """Persists the converted SVG metadata onto the icon and commits."""
    icon = await db.get(TechnologyIcon, icon_id)
    if icon is None:
        return
    icon.svg_storage_key = svg_storage_key
    icon.svg_downloaded_at = svg_downloaded_at
    icon.svg_file_size = svg_file_size
    await db.commit()


async def save_failure(
    db: AsyncSession,
    icon_id: int,
    *,
    retry_count: int,
    last_error: str,
    last_attempt_at: datetime,
) -> None:
    """Persists the retry bookkeeping for a failed icon and commits."""
    icon = await db.get(TechnologyIcon, icon_id)
    if icon is None:
        return
    icon.retry_count = retry_count
    icon.last_error = last_error
    icon.last_attempt_at = last_attempt_at
    await db.commit()

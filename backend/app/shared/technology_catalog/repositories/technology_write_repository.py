"""Technology upsert for the external-catalog → catalog sync (gjo_se_com).

Owns the idempotent technology upsert with slug-collision resolution and the
source→column mapping. Split out of ``technology_sync_repository`` so that
module stays cohesive (LCOM4): the upsert cluster shares no collaborator with
the status or icon clusters.
"""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.slugify.slugify import slugify
from app.shared.technology_catalog.models.technology import Technology
from app.shared.technology_catalog.schemas.catalog_source_schemas import CatalogSourceTechnologyOut
from app.shared.technology_catalog.schemas.technology_schemas import TechnologySyncResultOut

logger = structlog.get_logger(__name__)

_DEFAULT_COLOR = "gray"

_CATALOG_SOURCE_COLOR_MAP: dict[str, str] = {
    "blue": "blue",
    "green": "green",
    "yellow": "yellow",
    "orange": "orange",
    "red": "red",
    "purple": "violet",
    "pink": "pink",
    "grey": "gray",
    "beaver": "amber",
    "dark-blue": "sky",
    "white": "gray",
    "black": "gray",
}


async def upsert_technology(
    db: AsyncSession,
    entry: CatalogSourceTechnologyOut,
    result: TechnologySyncResultOut,
) -> int:
    """Insert or update a Technology row and return its primary key.

    Idempotent: SELECT by ``external_id`` first, then INSERT or UPDATE.
    Counts ``created``, ``updated``, or ``unchanged`` in ``result``.

    On both INSERT and UPDATE, a UNIQUE collision on ``slug`` is resolved
    by appending a numeric suffix (``-2``, ``-3``, …). If no unique slug
    can be found after 10 attempts the entry is skipped with a warning.
    On UPDATE, if the new slug cannot be resolved the original slug is kept.
    """
    values = _build_technology_values(entry)

    existing = await db.scalar(select(Technology).where(Technology.external_id == entry.id))

    if existing is not None:
        changed = False
        for key, value in values.items():
            if key == "external_id":
                continue
            current = getattr(existing, key, None)
            if current != value:
                if key == "slug" and value is not None:
                    # Resolve UNIQUE collision on slug during UPDATE
                    resolved = await _resolve_slug_collision(db, str(value), exclude_id=existing.id)
                    if resolved is not None:
                        setattr(existing, key, resolved)
                        changed = True
                    continue
                setattr(existing, key, value)
                changed = True
        if changed:
            db.add(existing)
            result.updated += 1
        else:
            result.unchanged += 1
        return existing.id

    # Insert with UNIQUE collision resolution on slug
    resolved_slug = await _resolve_slug_collision(db, str(values["slug"]), exclude_id=None)
    if resolved_slug is None:
        logger.warning(
            "Could not resolve UNIQUE collision for slug=%s – skipping entry %s",
            values["slug"],
            entry.id,
        )
        raise ValueError(f"UNIQUE collision on slug {values['slug']}")
    values["slug"] = resolved_slug

    tech = Technology(**values)
    db.add(tech)
    await db.flush()
    result.created += 1
    return tech.id


def _map_color(source_color: str | None) -> str:
    """Map catalog source color to Technology color_token."""
    if source_color is None:
        return _DEFAULT_COLOR
    return _CATALOG_SOURCE_COLOR_MAP.get(source_color.lower(), _DEFAULT_COLOR)


def _build_technology_values(entry: CatalogSourceTechnologyOut) -> dict[str, object]:
    """Map CatalogSourceTechnologyOut fields to Technology column values.

    ``slug`` uses ``entry.defaultSlug`` (catalog source field) with a
    ``slugify(entry.name)`` fallback when the source field is null.
    """
    return {
        "external_id": entry.id,
        "name": entry.name,
        "name_short": entry.nameShort,
        "provider": entry.provider,
        "type": entry.type,
        "color_token": _map_color(entry.color),
        "viscera_restrictions": entry.restrictions,
        "description": entry.description,
        "website_url": entry.websiteUrl,
        "docs_url": entry.docsUrl,
        "slug": entry.defaultSlug or slugify(entry.name),
        "slugs": entry.slugs,
    }


async def _resolve_slug_collision(
    db: AsyncSession,
    base_slug: str,
    *,
    exclude_id: int | None,
) -> str | None:
    """Try to find a unique slug by appending numeric suffixes.

    Args:
        db: Active database session.
        base_slug: The desired slug value.
        exclude_id: If set, exclude this technology id from the conflict check
                    (used during UPDATE to avoid self-conflict).

    Returns:
        A unique slug (may be the original if no conflict), or None if no
        unique value could be found after 10 attempts.
    """
    for attempt in range(1, 11):
        candidate = base_slug if attempt == 1 else f"{base_slug}-{attempt + 1}"
        stmt = select(Technology.id).where(Technology.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Technology.id != exclude_id)
        conflict_id = await db.scalar(stmt)
        if conflict_id is None:
            return candidate
    return None

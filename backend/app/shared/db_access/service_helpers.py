"""Domänenfreie Service-Helfer für wiederkehrendes Lade-/Update-Boilerplate.

Kapselt das in ``app/**/services/*.py`` kopierte Muster
``repository.get_by_ids(...)`` + „not found"-Validator
(``if len(items) != len(ids): ... raise ValueError``) sowie die
Slug-Auflösung beim Anlegen eines ``(name, category)``-Eintrags. Die Helfer sind
domänenfrei (Protokoll + ``TypeVar`` bzw. injizierter Probe-Callable) und liegen
bewusst in ``app.shared.db_access`` – Kontexte dürfen sie importieren, sie
importieren keine Domäne.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable, Sequence
from typing import Protocol, cast

from fastapi import HTTPException
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.slugify.slugify import slugify

logger = logging.getLogger(__name__)


class HasId(Protocol):
    """Minimal-Protokoll für Entitäten mit ``id``-Attribut."""

    id: int


async def load_all_or_raise[T](
    load: Callable[[AsyncSession, list[int]], Awaitable[Sequence[T]]],
    db: AsyncSession,
    ids: list[int],
    *,
    label: str,
) -> list[T]:
    """Lädt alle ``ids`` über die Repository-public-API; fehlt eine → ``ValueError``.

    Args:
        load: Repository-Funktion mit Signatur ``(db, ids) -> awaitable``,
            z. B. ``skill_repository.get_by_ids``.
        db: Aktive DB-Session.
        ids: Erwartete IDs (Reihenfolge relevant für die Fehlermeldung).
        label: Anzeigename für die Fehlermeldung (z. B. ``"Skills"``).

    Returns:
        Liste aller gefundenen Objekte in Repository-Reihenfolge.

    Raises:
        ValueError: Wenn nicht alle ``ids`` gefunden wurden.
    """
    items = list(await load(db, ids))
    if len(items) != len(ids):
        found = {cast("HasId", item).id for item in items}
        missing = [item_id for item_id in ids if item_id not in found]
        raise ValueError(f"{label} not found: {missing}")
    return items


async def resolve_unique_slug(
    slug_exists: Callable[[AsyncSession, str], Awaitable[bool]],
    db: AsyncSession,
    *,
    name: str,
    category: str,
    slug: str | None,
    label: str,
) -> str:
    """Resolve the final slug for a new ``(name, category)`` entity.

    An explicitly provided slug must be unused (else HTTP 409); an empty slug is
    auto-generated from ``category-name`` – unique by construction because
    ``(name, category)`` is unique.

    Args:
        slug_exists: Repository probe ``(db, slug) -> awaitable[bool]``.
        db: Active DB session.
        name: Entity name.
        category: Entity category.
        slug: Requested slug, or ``None``/empty to auto-generate.
        label: Entity label for the conflict message (e.g. ``"Status"``).

    Returns:
        The slug to persist.

    Raises:
        HTTPException: 409 when the provided slug already exists.
    """
    if slug:
        if await slug_exists(db, slug):
            logger.warning("Duplicate slug '%s' for new %s '%s'", slug, label, name)
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Slug '{slug}' ist bereits vergeben.",
            )
        return slug
    return slugify(f"{category}-{name}")

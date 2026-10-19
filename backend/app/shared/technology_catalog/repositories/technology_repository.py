"""Database access for the shared technology catalog read/write model.

Holds the SQLAlchemy queries, cross-DB status resolution and ORM→DTO mapping for
the admin technology catalog. Extracted from ``technology_service`` so the
service stays query-free (Achse 2: ``services`` > ``repositories``; the service
query-free contract K1/K2/K3). Read functions return ``TechnologyResponse`` DTOs
(never ORM models) so the service layer imports no ``app.<ctx>.models``.
"""

from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.technology_catalog.models.technology import Technology
from app.shared.technology_catalog.schemas.technology_schemas import (
    TechnologyIconResponse,
    TechnologyResponse,
)

logger = structlog.get_logger(__name__)

_SORTABLE_COLUMNS: dict[str, Any] = {
    "id": Technology.id,
    "slug": Technology.slug,
    "name": Technology.name,
    "provider": Technology.provider,
    "type": Technology.type,
    "color_token": Technology.color_token,
    "created_at": Technology.created_at,
    "updated_at": Technology.updated_at,
}

_DEFAULT_LIMIT = 20
_MAX_LIMIT = 500
_STATUSABLE_TYPE = "technology_catalog"


def _build_base_query() -> Select[Any]:
    """Builds the base query with eager-loaded icons (status resolved separately)."""
    return select(Technology).options(selectinload(Technology.icons))


def _apply_filters(
    stmt: Select[Any],
    q: str | None = None,
    provider: str | None = None,
    technology_type: str | None = None,
    status: str | None = None,
) -> Select[Any]:
    """Applies dynamic WHERE conditions to the statement.

    Status is resolved in Python after the cross-DB lookup, so the ``status``
    argument is accepted for signature parity but never filtered in SQL.
    """
    del status
    conditions: list[ColumnElement[bool]] = []

    if q:
        pattern = f"%{q}%"
        conditions.append(or_(Technology.name.ilike(pattern), Technology.slug.ilike(pattern)))
    if provider is not None:
        conditions.append(Technology.provider == provider)
    if technology_type is not None:
        conditions.append(Technology.type == technology_type)

    if conditions:
        stmt = stmt.where(and_(*conditions))
    return stmt


def _apply_sorting(stmt: Select[Any], sort_by: str, sort_dir: str) -> Select[Any]:
    """Applies ORDER BY with whitelist validation (unknown columns fall back to name)."""
    column = _SORTABLE_COLUMNS.get(sort_by)
    if column is not None:
        stmt = stmt.order_by(column.desc() if sort_dir == "desc" else column.asc())
    else:
        stmt = stmt.order_by(Technology.name.asc())
    return stmt


async def list_all(
    db: AsyncSession,
    *,
    q: str | None = None,
    provider: str | None = None,
    technology_type: str | None = None,
    status: str | None = None,
    offset: int = 0,
    limit: int = _DEFAULT_LIMIT,
    sort_by: str = "name",
    sort_dir: str = "asc",
) -> list[TechnologyResponse]:
    """Returns the paginated, filtered, sorted catalog as response DTOs."""
    limit = min(limit, _MAX_LIMIT)
    stmt = _build_base_query()
    stmt = _apply_filters(stmt, q, provider, technology_type, status=None)
    stmt = _apply_sorting(stmt, sort_by, sort_dir)
    stmt = stmt.offset(offset).limit(limit)

    rows = (await db.execute(stmt)).unique().all()
    technologies: list[Technology] = [row[0] for row in rows]

    status_map = await _resolve_statuses_batch(technologies)
    responses: list[TechnologyResponse] = []
    for tech in technologies:
        entry = status_map.get(tech.id)
        responses.append(_row_to_response(tech, entry[0] if entry else None, entry[1] if entry else None))

    if status is not None:
        responses = [r for r in responses if r.status == status]
    return responses


async def count(
    db: AsyncSession,
    *,
    q: str | None = None,
    provider: str | None = None,
    technology_type: str | None = None,
    status: str | None = None,
) -> int:
    """Returns the total number of technologies matching the given filters."""
    stmt = select(func.count()).select_from(Technology)
    stmt = _apply_filters(stmt, q, provider, technology_type, status=None)
    del status
    return (await db.scalar(stmt)) or 0


async def get_by_id(db: AsyncSession, technology_id: int) -> TechnologyResponse | None:
    """Returns a single technology by id as a response DTO, or ``None``."""
    stmt = select(Technology).options(selectinload(Technology.icons)).where(Technology.id == technology_id)
    tech = await db.scalar(stmt)
    if tech is None:
        return None
    status_name, status_color = await _resolve_status(tech.id)
    return _row_to_response(tech, status_name, status_color)


async def patch(
    db: AsyncSession,
    technology_id: int,
    changes: dict[str, object],
) -> TechnologyResponse | None:
    """Applies scalar ``changes`` to a technology and returns its response DTO."""
    stmt = select(Technology).options(selectinload(Technology.icons)).where(Technology.id == technology_id)
    technology = await db.scalar(stmt)
    if technology is None:
        return None

    for field, value in changes.items():
        setattr(technology, field, value)

    db.add(technology)
    await db.commit()
    await db.refresh(technology)

    status_name, status_color = await _resolve_status(technology.id)
    return _row_to_response(technology, status_name, status_color)


async def _resolve_statuses_batch(technologies: list[Technology]) -> dict[int, tuple[str | None, str | None]]:
    """Batch-resolves core_status for the given technologies from gjo_se_com.

    Returns:
        Map ``technology.id -> (status_name, color_token)``.
    """
    ids = [t.id for t in technologies]
    if not ids:
        return {}
    try:
        from app.shared.status.models.status import Status, Statusable

        async with AsyncSessionLocal() as gjo_db:
            stmt = (
                select(Statusable.statusable_id, Status.name, Status.color_token)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == _STATUSABLE_TYPE,
                    Statusable.statusable_id.in_(ids),
                )
            )
            rows = (await gjo_db.execute(stmt)).all()
        return {row[0]: (row[1], row[2]) for row in rows}
    except Exception:
        logger.exception("Failed to resolve technology_catalog statuses")
        return {}


async def _resolve_status(technology_id: int) -> tuple[str | None, str | None]:
    """Resolves core_status for a single technology via gjo_se_com."""
    try:
        from app.shared.status.repositories import statusable_repository

        async with AsyncSessionLocal() as gjo_db:
            return await statusable_repository.resolve_status(gjo_db, _STATUSABLE_TYPE, technology_id) or (
                None,
                None,
            )
    except Exception:
        logger.exception("Failed to resolve status for technology id=%s", technology_id)
        return None, None


def _row_to_response(
    tech: Technology,
    status_name: str | None,
    status_color: str | None = None,
) -> TechnologyResponse:
    """Maps a Technology ORM row (with icons) and resolved status to a response DTO."""
    icons: list[TechnologyIconResponse] = []
    for icon in tech.icons or []:
        key = icon.svg_storage_key or icon.storage_key
        icon_url = f"/api/v1/public/technology-catalog/icons/stream/{key}" if key else None
        icons.append(
            TechnologyIconResponse(
                id=icon.id,
                variant=icon.variant,
                storage_key=icon.storage_key,
                downloaded_at=icon.downloaded_at,
                file_size=icon.file_size,
                svg_storage_key=icon.svg_storage_key,
                svg_downloaded_at=icon.svg_downloaded_at,
                svg_file_size=icon.svg_file_size,
                icon_url=icon_url,
            )
        )

    return TechnologyResponse(
        id=tech.id,
        slug=tech.slug,
        slugs=tech.slugs,
        name=tech.name,
        name_short=tech.name_short,
        provider=tech.provider,
        type=tech.type,
        color_token=tech.color_token,
        viscera_restrictions=tech.viscera_restrictions,
        description=tech.description,
        website_url=tech.website_url,
        docs_url=tech.docs_url,
        created_at=tech.created_at,
        updated_at=tech.updated_at,
        status=status_name,
        status_color_token=status_color,
        icons=icons,
    )

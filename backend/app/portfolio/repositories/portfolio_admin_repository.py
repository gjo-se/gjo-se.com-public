"""Database access for the paginated admin portfolio list (gjo_se_com).

Owns the server-side search/sort/pagination queries backing the admin table.
The core portfolio reads and writes live in :mod:`portfolio_repository`.
"""

from typing import Any

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.selectable import ScalarSelect

from app.portfolio.domain.portfolio_contract import PortfolioRecord
from app.portfolio.models.portfolio import Portfolio
from app.portfolio.models.translation import Translation
from app.portfolio.repositories.portfolio_repository import to_record


def _de_title_subq() -> ScalarSelect[str]:
    """Scalar subquery selecting the German ``title`` of a portfolio.

    Used for search (``q``) and ``title`` sorting in the paginated admin list.
    Correlates against ``Portfolio`` so it can be reused in ``WHERE``
    and ``ORDER BY`` without an explicit join (avoids a selectinload/join clash
    on the translation relationship).

    Returns:
        A correlated scalar subquery over ``portfolio_translation.title``.
    """
    return (
        select(Translation.title)
        .where(
            Translation.portfolio_id == Portfolio.id,
            Translation.locale == "de",
        )
        .correlate(Portfolio)
        .scalar_subquery()
    )


async def list_paginated(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "sort",
    sort_order: str = "asc",
) -> list[Portfolio]:
    """Returns a paginated page of portfolios with eager-loaded translations.

    Supports optional case-insensitive search across ``slug`` and the German
    ``title``, plus server-side sorting over the structure fields or the
    German title. Intended for the admin server-side table.

    Args:
        db: Active async DB session.
        q: Search term matching ``slug`` or the German ``title`` via ILIKE.
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Sort key: ``slug``, ``link_url``, ``link_label``, ``year``,
            ``sort`` or ``title`` (German title).
        sort_order: ``asc`` or ``desc``.

    Returns:
        The requested page of Portfolio ordered by ``sort_by``.
    """
    de_title = _de_title_subq()
    sort_cols: dict[str, Any] = {
        "slug": Portfolio.slug,
        "link_url": Portfolio.link_url,
        "link_label": Portfolio.link_label,
        "year": Portfolio.year,
        "sort": Portfolio.sort,
        "title": de_title,
    }
    sort_col = sort_cols.get(sort_by, Portfolio.sort)
    order_expr = desc(sort_col) if sort_order == "desc" else asc(sort_col)

    stmt = select(Portfolio).options(selectinload(Portfolio.translations)).order_by(order_expr)
    if q:
        stmt = stmt.where(
            or_(
                Portfolio.slug.ilike(f"%{q}%"),
                de_title.ilike(f"%{q}%"),
            )
        )
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count(db: AsyncSession, q: str | None = None) -> int:
    """Returns the number of portfolios, optionally filtered by search.

    Applies the same ``q`` filter as :func:`list_paginated` (slug or German
    title) so the count stays consistent with the paginated list.

    Args:
        db: Active async DB session.
        q: Search term matching ``slug`` or the German ``title`` via ILIKE.

    Returns:
        Total number of matching portfolios.
    """
    stmt = select(func.count()).select_from(Portfolio)
    if q:
        de_title = _de_title_subq()
        stmt = stmt.where(
            or_(
                Portfolio.slug.ilike(f"%{q}%"),
                de_title.ilike(f"%{q}%"),
            )
        )
    result = await db.execute(stmt)
    return result.scalar_one()


async def list_records(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "sort",
    sort_order: str = "asc",
) -> list[PortfolioRecord]:
    """Returns a paginated page of portfolios as service-boundary records.

    Applies the same search/sort/pagination as :func:`list_paginated` and maps
    each ORM row to a :class:`PortfolioRecord`.

    Args:
        db: Active async DB session.
        q: Search term matching ``slug`` or the German ``title`` via ILIKE.
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Sort key (structure field or ``title``).
        sort_order: ``asc`` or ``desc``.

    Returns:
        The requested page of portfolio records (with translations).
    """
    portfolios = await list_paginated(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return [to_record(portfolio) for portfolio in portfolios]

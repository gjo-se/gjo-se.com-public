"""Integration tests for the portfolio admin repository (gjo_se_com).

Exercises the server-side search/sort/pagination queries backing the admin
table against the real Postgres test database.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.models.portfolio import Portfolio
from app.portfolio.models.translation import Translation
from app.portfolio.repositories import portfolio_admin_repository

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def _create_portfolio(db: AsyncSession, slug: str, *, sort: int = 0, title: str = "Titel") -> Portfolio:
    """Persist a portfolio with one German translation and return it."""
    portfolio = Portfolio(slug=slug, sort=sort)
    db.add(portfolio)
    await db.flush()
    db.add(Translation(portfolio_id=portfolio.id, locale="de", title=title))
    await db.commit()
    return portfolio


async def test_count_and_list_paginated_filter_by_german_title(db_session: AsyncSession) -> None:
    """Search matches the German title and stays consistent with the count."""
    await _create_portfolio(db_session, "match-a", title="Datenplattform")
    await _create_portfolio(db_session, "match-b", title="Anderes Projekt")

    matched = await portfolio_admin_repository.list_paginated(db_session, q="Datenplattform")
    total = await portfolio_admin_repository.count(db_session, q="Datenplattform")

    assert [p.slug for p in matched] == ["match-a"]
    assert total == 1


async def test_list_paginated_sorts_by_german_title(db_session: AsyncSession) -> None:
    """Sorting by ``title`` orders on the correlated German-title subquery."""
    await _create_portfolio(db_session, "b", title="Zebra")
    await _create_portfolio(db_session, "a", title="Alpha")

    result = await portfolio_admin_repository.list_paginated(db_session, sort_by="title", sort_order="asc")

    assert [p.slug for p in result] == ["a", "b"]


async def test_list_paginated_respects_offset_and_limit(db_session: AsyncSession) -> None:
    """Offset/limit slice the ordered result set."""
    await _create_portfolio(db_session, "one", sort=0)
    await _create_portfolio(db_session, "two", sort=1)
    await _create_portfolio(db_session, "three", sort=2)

    page = await portfolio_admin_repository.list_paginated(db_session, offset=1, limit=1)

    assert [p.slug for p in page] == ["two"]
    assert await portfolio_admin_repository.count(db_session) == 3

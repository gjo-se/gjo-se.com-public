"""Integration tests for the portfolio repository (gjo_se_com).

Exercises the public query/write API against the real Postgres test database –
listing/ordering, slug lookups, reordering and the translation-table replace
pattern. The paginated admin list is covered in
``test_portfolio_admin_repository.py``; the proof sub-resource in
``test_portfolio_proof_repository.py``.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.models.portfolio import Portfolio
from app.portfolio.models.translation import Translation
from app.portfolio.repositories import portfolio_repository
from app.portfolio.schemas.portfolio_schemas import LocaleFieldsOut

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def _create_portfolio(db: AsyncSession, slug: str, *, sort: int = 0, title: str = "Titel") -> Portfolio:
    """Persist a portfolio with one German translation and return it."""
    portfolio = Portfolio(slug=slug, sort=sort)
    db.add(portfolio)
    await db.flush()
    db.add(Translation(portfolio_id=portfolio.id, locale="de", title=title))
    await db.commit()
    return portfolio


async def _translation_titles(db: AsyncSession, portfolio_id: int) -> list[str]:
    """Return all translation titles of a portfolio."""
    result = await db.execute(select(Translation.title).where(Translation.portfolio_id == portfolio_id))
    return list(result.scalars().all())


async def test_get_list_orders_portfolios_by_sort_ascending(db_session: AsyncSession) -> None:
    """``get_list`` returns rows ordered by their ``sort`` index."""
    await _create_portfolio(db_session, "b-second", sort=2)
    await _create_portfolio(db_session, "a-first", sort=1)

    result = await portfolio_repository.get_list(db_session)

    assert [portfolio.slug for portfolio in result] == ["a-first", "b-second"]


async def test_get_by_slug_returns_none_for_unknown_slug(db_session: AsyncSession) -> None:
    """An unknown slug resolves to ``None``."""
    assert await portfolio_repository.get_by_slug(db_session, "does-not-exist") is None


async def test_get_by_slug_eager_loads_translations(db_session: AsyncSession) -> None:
    """The fetched portfolio exposes its translations without an extra query."""
    await _create_portfolio(db_session, "with-translation", title="Deutscher Titel")

    portfolio = await portfolio_repository.get_by_slug(db_session, "with-translation")

    assert portfolio is not None
    assert portfolio.translations[0].title == "Deutscher Titel"


async def test_slug_exists_ignores_the_excluded_id(db_session: AsyncSession) -> None:
    """``exclude_id`` lets a portfolio keep its own slug on update."""
    portfolio = await _create_portfolio(db_session, "own-slug")

    assert await portfolio_repository.slug_exists(db_session, "own-slug") is True
    assert await portfolio_repository.slug_exists(db_session, "own-slug", exclude_id=portfolio.id) is False


async def test_reorder_assigns_list_index_as_sort(db_session: AsyncSession) -> None:
    """Reordering writes the position index into ``sort``."""
    first = await _create_portfolio(db_session, "one", sort=0)
    second = await _create_portfolio(db_session, "two", sort=1)

    result = await portfolio_repository.reorder(db_session, ["two", "one"])

    assert [(p.slug, p.sort) for p in result] == [("two", 0), ("one", 1)]
    assert second.id != first.id


async def test_replace_translations_replaces_the_whole_locale_set(db_session: AsyncSession) -> None:
    """The replace pattern swaps old rows for the new set in one flush."""
    portfolio = await _create_portfolio(db_session, "replace-me", title="Alt")

    await portfolio_repository.replace_translations(
        db_session,
        portfolio,
        {"de": LocaleFieldsOut(title="Neu"), "en": LocaleFieldsOut(title="New")},
    )
    await db_session.commit()

    assert sorted(await _translation_titles(db_session, portfolio.id)) == ["Neu", "New"]


async def test_delete_removes_portfolio_but_not_other_slugs(db_session: AsyncSession) -> None:
    """Deleting removes exactly the addressed portfolio."""
    keep = await _create_portfolio(db_session, "keep")
    remove = await _create_portfolio(db_session, "remove")

    await portfolio_repository.delete(db_session, remove)
    await db_session.commit()

    assert await portfolio_repository.get_by_slug(db_session, "keep") is not None
    assert await portfolio_repository.get_by_slug(db_session, "remove") is None
    assert keep.slug == "keep"


async def test_get_proofs_returns_none_for_unknown_slug(db_session: AsyncSession) -> None:
    """An unknown slug yields ``None`` (not an empty list)."""
    assert await portfolio_repository.get_proofs(db_session, "missing") is None

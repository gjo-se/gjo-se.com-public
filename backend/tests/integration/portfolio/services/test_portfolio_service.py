"""Integration tests for the public portfolio read service.

Covers locale resolution with the German fallback, the ``inactive`` visibility
filter and the not-found contract, against the real Postgres test database.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.models.portfolio import Portfolio
from app.portfolio.models.proof import Proof
from app.portfolio.models.proof_translation import ProofTranslation
from app.portfolio.models.translation import Translation
from app.portfolio.services import portfolio_service
from app.portfolio.services.portfolio_service import PortfolioNotFoundError
from app.shared.status.models.status import Status, Statusable

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def _create_portfolio(
    db: AsyncSession,
    slug: str,
    *,
    sort: int = 0,
    de_title: str = "Titel DE",
    en_title: str | None = None,
) -> Portfolio:
    """Persist a portfolio with a German (and optional English) translation."""
    portfolio = Portfolio(slug=slug, sort=sort)
    db.add(portfolio)
    await db.flush()
    db.add(Translation(portfolio_id=portfolio.id, locale="de", title=de_title))
    if en_title is not None:
        db.add(Translation(portfolio_id=portfolio.id, locale="en", title=en_title))
    await db.commit()
    return portfolio


async def _mark_inactive(db: AsyncSession, portfolio_id: int) -> None:
    """Attach the ``inactive`` status so the portfolio is hidden publicly."""
    status = Status(name="inactive", slug="general-inactive", category="general", color_token="red")
    db.add(status)
    await db.flush()
    db.add(Statusable(status_id=status.id, statusable_type="portfolio", statusable_id=portfolio_id))
    await db.commit()


async def _add_proof(db: AsyncSession, portfolio_id: int, *, sort: int, statement_de: str, statement_en: str) -> Proof:
    """Persist a proof with German and English statements."""
    proof = Proof(portfolio_id=portfolio_id, sort=sort)
    db.add(proof)
    await db.flush()
    db.add(ProofTranslation(proof_id=proof.id, locale="de", statement=statement_de))
    db.add(ProofTranslation(proof_id=proof.id, locale="en", statement=statement_en))
    await db.commit()
    return proof


async def test_list_portfolios_excludes_inactive_status(db_session: AsyncSession) -> None:
    """A portfolio flagged ``inactive`` is omitted from the public list."""
    visible = await _create_portfolio(db_session, "visible", sort=0)
    hidden = await _create_portfolio(db_session, "hidden", sort=1)
    await _mark_inactive(db_session, hidden.id)

    result = await portfolio_service.list_portfolios(db_session, "de")

    assert [item.slug for item in result] == [visible.slug]


async def test_list_portfolios_falls_back_to_german_when_locale_missing(db_session: AsyncSession) -> None:
    """Requesting ``en`` without an English row returns the German title."""
    await _create_portfolio(db_session, "de-only", de_title="Nur Deutsch")

    result = await portfolio_service.list_portfolios(db_session, "en")

    assert [item.title for item in result] == ["Nur Deutsch"]


async def test_get_portfolio_raises_for_unknown_slug(db_session: AsyncSession) -> None:
    """An unknown slug raises ``PortfolioNotFoundError``."""
    with pytest.raises(PortfolioNotFoundError):
        await portfolio_service.get_portfolio(db_session, "missing", "de")


async def test_get_portfolio_raises_for_inactive_portfolio(db_session: AsyncSession) -> None:
    """An inactive portfolio is reported as not found to the public."""
    portfolio = await _create_portfolio(db_session, "inactive-detail")
    await _mark_inactive(db_session, portfolio.id)

    with pytest.raises(PortfolioNotFoundError):
        await portfolio_service.get_portfolio(db_session, "inactive-detail", "de")


async def test_get_portfolio_returns_localized_detail(db_session: AsyncSession) -> None:
    """The detail uses the requested locale when present."""
    await _create_portfolio(db_session, "localized", de_title="Deutsch", en_title="English")

    detail = await portfolio_service.get_portfolio(db_session, "localized", "en")

    assert detail.slug == "localized"
    assert detail.title == "English"


async def test_get_proofs_returns_localized_sorted_proofs(db_session: AsyncSession) -> None:
    """Proofs are returned in ``sort`` order with the requested locale."""
    portfolio = await _create_portfolio(db_session, "with-proofs")
    await _add_proof(db_session, portfolio.id, sort=1, statement_de="Zweitens", statement_en="Second")
    await _add_proof(db_session, portfolio.id, sort=0, statement_de="Erstens", statement_en="First")

    result = await portfolio_service.get_proofs(db_session, "with-proofs", "en")

    assert [proof.statement for proof in result] == ["First", "Second"]


async def test_get_proofs_raises_for_unknown_slug(db_session: AsyncSession) -> None:
    """Proofs of an unknown portfolio raise ``PortfolioNotFoundError``."""
    with pytest.raises(PortfolioNotFoundError):
        await portfolio_service.get_proofs(db_session, "missing", "de")

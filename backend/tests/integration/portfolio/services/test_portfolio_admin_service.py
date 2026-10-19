"""Integration tests for the admin portfolio CRUD service.

Covers slug normalization/conflict, the mandatory German translation/statement,
the translation-table update behaviour, proof scoping and the read-model
mapping, against the real Postgres test database.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.repositories import portfolio_repository
from app.portfolio.schemas.portfolio_schemas import (
    LocaleFieldsOut,
    PortfolioAdminCreate,
    PortfolioReorderRequest,
    PortfolioTranslationUpdate,
)
from app.portfolio.schemas.proof_schemas import ProofCreate
from app.portfolio.services import portfolio_admin_service
from app.portfolio.services.portfolio_admin_service import (
    PortfolioNotFoundError,
    PortfolioSlugConflictError,
    ProofNotFoundError,
)
from app.shared.status.models.status import Status, Statusable

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def _create(db: AsyncSession, slug: str, title: str = "Titel") -> str:
    """Create a portfolio via the service and return its persisted slug."""
    created = await portfolio_admin_service.create_portfolio(
        db, PortfolioAdminCreate(slug=slug, translations={"de": LocaleFieldsOut(title=title)})
    )
    await db.commit()
    return created.slug


async def test_create_portfolio_requires_german_translation(db_session: AsyncSession) -> None:
    """A payload without a ``de`` translation is rejected."""
    payload = PortfolioAdminCreate(slug="no-de", translations={"en": LocaleFieldsOut(title="Only English")})

    with pytest.raises(ValueError):
        await portfolio_admin_service.create_portfolio(db_session, payload)


async def test_create_portfolio_normalizes_slug(db_session: AsyncSession) -> None:
    """The slug is normalized via the shared slugify SSOT."""
    payload = PortfolioAdminCreate(slug="Mein Großes Projekt", translations={"de": LocaleFieldsOut(title="T")})

    created = await portfolio_admin_service.create_portfolio(db_session, payload)
    await db_session.commit()

    assert created.slug == "mein-grosses-projekt"


async def test_create_portfolio_with_duplicate_slug_raises_conflict(db_session: AsyncSession) -> None:
    """A normalized slug already in use is rejected."""
    await _create(db_session, "conflict")

    with pytest.raises(PortfolioSlugConflictError):
        await portfolio_admin_service.create_portfolio(
            db_session,
            PortfolioAdminCreate(slug="conflict", translations={"de": LocaleFieldsOut(title="T")}),
        )


async def test_get_portfolio_raises_for_unknown_slug(db_session: AsyncSession) -> None:
    """An unknown slug raises ``PortfolioNotFoundError``."""
    with pytest.raises(PortfolioNotFoundError):
        await portfolio_admin_service.get_portfolio(db_session, "missing")


async def test_update_translation_keeps_existing_title_when_blank(db_session: AsyncSession) -> None:
    """A partial translation update never wipes the required title."""
    slug = await _create(db_session, "keep-title", title="Original")

    await portfolio_admin_service.update_translation(
        db_session, slug, "de", PortfolioTranslationUpdate(title="", teaser="Neuer Teaser")
    )
    await db_session.commit()

    portfolio = await portfolio_repository.get_by_slug(db_session, slug)
    assert portfolio is not None
    translation = next(t for t in portfolio.translations if t.locale == "de")
    assert translation.title == "Original"
    assert translation.teaser == "Neuer Teaser"


async def test_delete_portfolio_raises_for_unknown_slug(db_session: AsyncSession) -> None:
    """Deleting an unknown slug raises ``PortfolioNotFoundError``."""
    with pytest.raises(PortfolioNotFoundError):
        await portfolio_admin_service.delete_portfolio(db_session, "missing")


async def test_create_proof_requires_german_statement(db_session: AsyncSession) -> None:
    """A proof without a ``de`` statement is rejected."""
    slug = await _create(db_session, "proof-no-de")

    with pytest.raises(ValueError):
        await portfolio_admin_service.create_proof(db_session, slug, ProofCreate(statements={"en": "English only"}))


async def test_create_proof_auto_increments_sort(db_session: AsyncSession) -> None:
    """Successive proofs receive incrementing ``sort`` values."""
    slug = await _create(db_session, "proof-sort")

    first = await portfolio_admin_service.create_proof(db_session, slug, ProofCreate(statements={"de": "Erst"}))
    await db_session.commit()
    second = await portfolio_admin_service.create_proof(db_session, slug, ProofCreate(statements={"de": "Zweit"}))
    await db_session.commit()

    assert (first.sort, second.sort) == (1, 2)


async def test_update_proof_rejects_foreign_proof(db_session: AsyncSession) -> None:
    """A proof belonging to another portfolio cannot be updated via this slug."""
    slug_a = await _create(db_session, "owner-a")
    slug_b = await _create(db_session, "owner-b")
    foreign = await portfolio_admin_service.create_proof(
        db_session, slug_b, ProofCreate(statements={"de": "Gehoert B"})
    )
    await db_session.commit()

    with pytest.raises(ProofNotFoundError):
        await portfolio_admin_service.update_proof(db_session, slug_a, foreign.id, ProofCreate(statements={"de": "x"}))


async def test_list_proofs_returns_all_statements(db_session: AsyncSession) -> None:
    """The admin proof list carries the localized statements per locale."""
    slug = await _create(db_session, "list-proofs")
    await portfolio_admin_service.create_proof(
        db_session, slug, ProofCreate(statements={"de": "Deutsch", "en": "English"})
    )
    await db_session.commit()

    result = await portfolio_admin_service.list_proofs(db_session, slug)

    assert result[0].statements == {"de": "Deutsch", "en": "English"}


async def test_reorder_portfolios_writes_positions(db_session: AsyncSession) -> None:
    """Reordering returns the portfolios in the requested order."""
    await _create(db_session, "reorder-one")
    await _create(db_session, "reorder-two")

    result = await portfolio_admin_service.reorder_portfolios(
        db_session, PortfolioReorderRequest(ordered_slugs=["reorder-two", "reorder-one"])
    )

    assert [item.slug for item in result] == ["reorder-two", "reorder-one"]


async def test_to_admin_out_projects_translations_and_status(db_session: AsyncSession) -> None:
    """The admin read-model exposes translations and the resolved status."""
    slug = await _create(db_session, "with-status", title="Mit Status")
    status = Status(name="active", slug="general-active", category="general", color_token="green")
    db_session.add(status)
    await db_session.flush()
    portfolio = await portfolio_repository.get_by_slug(db_session, slug)
    assert portfolio is not None
    db_session.add(Statusable(status_id=status.id, statusable_type="portfolio", statusable_id=portfolio.id))
    await db_session.commit()

    row = await portfolio_admin_service.get_portfolio(db_session, slug)
    admin_out = portfolio_admin_service.to_admin_out(row)

    assert admin_out.status == "active"
    assert admin_out.translations["de"].title == "Mit Status"

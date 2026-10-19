"""Integration tests for the portfolio proof repository (gjo_se_com).

Exercises the 1:N proof sub-resource (CRUD, ordering, statements/questions)
against the real Postgres test database.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.models.portfolio import Portfolio
from app.portfolio.models.proof import Proof
from app.portfolio.models.proof_translation import ProofTranslation
from app.portfolio.models.translation import Translation
from app.portfolio.repositories import portfolio_proof_repository

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def _create_portfolio(db: AsyncSession, slug: str, *, sort: int = 0, title: str = "Titel") -> Portfolio:
    """Persist a portfolio with one German translation and return it."""
    portfolio = Portfolio(slug=slug, sort=sort)
    db.add(portfolio)
    await db.flush()
    db.add(Translation(portfolio_id=portfolio.id, locale="de", title=title))
    await db.commit()
    return portfolio


async def _proof_translations(db: AsyncSession, proof_id: int) -> list[ProofTranslation]:
    """Return all translation rows of a proof."""
    result = await db.execute(select(ProofTranslation).where(ProofTranslation.proof_id == proof_id))
    return list(result.scalars().all())


async def test_get_max_proof_sort_is_zero_without_proofs(db_session: AsyncSession) -> None:
    """A portfolio without proofs reports a max sort of 0."""
    portfolio = await _create_portfolio(db_session, "no-proofs")

    assert await portfolio_proof_repository.get_max_proof_sort(db_session, portfolio.id) == 0


async def test_create_and_get_proof_roundtrip(db_session: AsyncSession) -> None:
    """A created proof is retrievable by id with its translations loaded."""
    portfolio = await _create_portfolio(db_session, "roundtrip")
    created = await portfolio_proof_repository.create_proof(db_session, Proof(portfolio_id=portfolio.id, sort=0))

    loaded = await portfolio_proof_repository.get_proof(db_session, created.id)

    assert loaded is not None
    assert loaded.id == created.id
    assert await portfolio_proof_repository.get_proof(db_session, 999999) is None


async def test_update_proof_flushes_changes(db_session: AsyncSession) -> None:
    """``update_proof`` persists pending attribute changes."""
    portfolio = await _create_portfolio(db_session, "update-proof")
    proof = await portfolio_proof_repository.create_proof(db_session, Proof(portfolio_id=portfolio.id, sort=0))
    proof.priority = "high"

    await portfolio_proof_repository.update_proof(db_session, proof)

    reloaded = await portfolio_proof_repository.get_proof(db_session, proof.id)
    assert reloaded is not None
    assert reloaded.priority == "high"


async def test_delete_proof_removes_it(db_session: AsyncSession) -> None:
    """``delete_proof`` removes the proof row."""
    portfolio = await _create_portfolio(db_session, "delete-proof")
    proof = await portfolio_proof_repository.create_proof(db_session, Proof(portfolio_id=portfolio.id, sort=0))

    await portfolio_proof_repository.delete_proof(db_session, proof)

    assert await portfolio_proof_repository.get_proof(db_session, proof.id) is None


async def test_replace_proof_statements_preserves_existing_question(db_session: AsyncSession) -> None:
    """Replacing statements keeps the localized question of the same row."""
    portfolio = await _create_portfolio(db_session, "proof-question")
    proof = await portfolio_proof_repository.create_proof(db_session, Proof(portfolio_id=portfolio.id, sort=0))
    await portfolio_proof_repository.replace_proof_statements(db_session, proof, {"de": "Alt"})
    await portfolio_proof_repository.upsert_proof_questions(db_session, proof, {"de": "Warum?"})

    await portfolio_proof_repository.replace_proof_statements(db_session, proof, {"de": "Neu"})

    translations = await _proof_translations(db_session, proof.id)
    assert [(t.statement, t.question) for t in translations] == [("Neu", "Warum?")]


async def test_upsert_proof_questions_creates_row_with_empty_statement(db_session: AsyncSession) -> None:
    """A question-only upsert creates a row with an empty (NOT NULL) statement."""
    portfolio = await _create_portfolio(db_session, "question-only")
    proof = await portfolio_proof_repository.create_proof(db_session, Proof(portfolio_id=portfolio.id, sort=0))

    await portfolio_proof_repository.upsert_proof_questions(db_session, proof, {"en": "Why?"})

    (translation,) = await _proof_translations(db_session, proof.id)
    assert translation.statement == ""
    assert translation.question == "Why?"


async def test_reorder_proofs_scopes_updates_to_the_portfolio(db_session: AsyncSession) -> None:
    """Reordering only touches proofs that belong to the portfolio."""
    portfolio = await _create_portfolio(db_session, "reorder-proofs")
    first = await portfolio_proof_repository.create_proof(db_session, Proof(portfolio_id=portfolio.id, sort=0))
    second = await portfolio_proof_repository.create_proof(db_session, Proof(portfolio_id=portfolio.id, sort=1))

    result = await portfolio_proof_repository.reorder_proofs(db_session, portfolio.id, [second.id, first.id])

    assert [p.id for p in result] == [second.id, first.id]

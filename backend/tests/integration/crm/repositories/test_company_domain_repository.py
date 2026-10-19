"""Integration tests for ``company_domain_repository`` (real Postgres).

Verifies that domain/URL normalisation (scheme, ``www.``, path, query) happens
before the case-insensitive website match.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.company import Company
from app.crm.repositories import company_domain_repository

pytestmark = pytest.mark.integration


async def test_get_by_domain_ci_normalises_scheme_and_www(db_session: AsyncSession) -> None:
    """Scheme, ``www.``, path and query are stripped before matching."""
    db_session.add(Company(name="Etengo", website="https://www.etengo.de/karriere"))
    await db_session.flush()

    found = await company_domain_repository.get_by_domain_ci(db_session, "etengo.de")

    assert found is not None
    assert found.name == "Etengo"


async def test_get_by_domain_ci_returns_none_for_blank_domain(db_session: AsyncSession) -> None:
    """A blank domain never matches."""
    db_session.add(Company(name="Etengo", website="https://etengo.de"))
    await db_session.flush()

    assert await company_domain_repository.get_by_domain_ci(db_session, "   ") is None

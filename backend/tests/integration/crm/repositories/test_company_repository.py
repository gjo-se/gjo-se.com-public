"""Integration tests for ``company_repository``.

Verifies case-insensitive name matching, pagination/count and deletion against a
real schema. Domain and normalised-name lookups are covered by
``test_company_domain_repository`` / ``test_company_name_repository``.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.company import Company
from app.crm.repositories import company_repository

pytestmark = pytest.mark.integration


async def test_get_by_name_ci_matches_ignoring_case(db_session: AsyncSession) -> None:
    """The name lookup is case-insensitive."""
    db_session.add(Company(name="Etengo GmbH"))
    await db_session.flush()

    found = await company_repository.get_by_name_ci(db_session, "ETENGO GMBH")

    assert found is not None
    assert found.name == "Etengo GmbH"


async def test_list_paginated_filters_by_name_search(db_session: AsyncSession) -> None:
    """The search term narrows the paginated result and count."""
    db_session.add(Company(name="Match GmbH"))
    db_session.add(Company(name="Other AG"))
    await db_session.flush()

    rows = await company_repository.list_paginated(db_session, q="Match")
    total = await company_repository.count(db_session, q="Match")

    assert [row.name for row in rows] == ["Match GmbH"]
    assert total == 1


async def test_delete_removes_company_row(db_session: AsyncSession) -> None:
    """Deleting a company leaves no row behind."""
    company = Company(name="To Delete GmbH")
    db_session.add(company)
    await db_session.flush()
    company_id = company.id

    await company_repository.delete(db_session, company_id)

    assert await company_repository.get_by_id(db_session, company_id) is None

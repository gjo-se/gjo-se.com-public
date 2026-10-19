"""Integration tests for ``company_name_repository`` (real Postgres).

Verifies that legal-form suffix stripping allows a bare stem to match a stored
company name with its legal form.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.company import Company
from app.crm.repositories import company_name_repository

pytestmark = pytest.mark.integration


async def test_get_by_normalized_name_strips_legal_suffix(db_session: AsyncSession) -> None:
    """A name with a legal-form suffix matches its bare stem."""
    db_session.add(Company(name="SAP SE"))
    await db_session.flush()

    found = await company_name_repository.get_by_normalized_name(db_session, "sap")

    assert found is not None
    assert found.name == "SAP SE"

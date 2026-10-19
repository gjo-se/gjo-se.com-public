"""Integration tests for the ``Company`` model.

Verifies the case-insensitive unique name contract (enforced by the functional
index ``uq_crm_company_name_lower`` on ``lower(name)``) – the SSOT dedup rule
for companies.
"""

from __future__ import annotations

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.company import Company

pytestmark = pytest.mark.integration


async def test_company_name_is_unique_case_insensitively(db_session: AsyncSession) -> None:
    """A second company whose name differs only in case is rejected."""
    db_session.add(Company(name="Acme GmbH"))
    await db_session.flush()

    db_session.add(Company(name="acme gmbh"))
    with pytest.raises(IntegrityError):
        await db_session.flush()

    await db_session.rollback()


async def test_company_with_distinct_name_is_accepted(db_session: AsyncSession) -> None:
    """Two genuinely different names coexist."""
    db_session.add(Company(name="Acme GmbH"))
    db_session.add(Company(name="Beta AG"))
    await db_session.flush()

    count = await db_session.scalar(select(func.count()).select_from(Company))
    assert count == 2

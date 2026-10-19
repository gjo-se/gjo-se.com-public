"""Integration-Tests fuer SearchTerm ORM-Model."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.search_term import SearchTerm

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_search_term_name_unique_raises_integrity_error(
    gjo_se_db_session: AsyncSession,
) -> None:
    """Doppelter name → IntegrityError."""
    gjo_se_db_session.add(SearchTerm(name="Duplicate Term"))
    await gjo_se_db_session.commit()

    gjo_se_db_session.add(SearchTerm(name="Duplicate Term"))
    with pytest.raises(IntegrityError):
        await gjo_se_db_session.commit()

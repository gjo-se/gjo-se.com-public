"""Unit-Tests fuer SearchTerm ORM-Model."""

import pytest

from app.fbf.models.search_term import SearchTerm


@pytest.mark.asyncio
@pytest.mark.unit
async def test_search_term_tablename() -> None:
    """SearchTerm.__tablename__ ist 'fbf_search_term'."""
    assert SearchTerm.__tablename__ == "fbf_search_term"

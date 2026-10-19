"""Unit-Tests für search_term_service.

Testet:
- list_all: alle SearchTerms auflisten
- list_active: nur aktive SearchTerms
- create: neue SearchTerm anlegen, Duplikat-Check
- update: SearchTerm aktualisieren, 404 + 409 Fehler
- delete: SearchTerm löschen, 404 Fehler
"""

import pytest
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.services import search_term_service

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_delete_raises_404_when_not_found(
    gjo_se_db_session: AsyncSession,
) -> None:
    """delete wirft 404 wenn SearchTerm nicht existiert."""
    with pytest.raises(HTTPException) as exc_info:
        await search_term_service.delete(gjo_se_db_session, search_term_id=99999)
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

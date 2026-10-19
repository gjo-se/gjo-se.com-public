"""Integration tests for ``endcustomer_service`` (guard paths)."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.services import endcustomer_service

pytestmark = pytest.mark.integration


async def test_confirm_candidate_missing_raises_404(db_session: AsyncSession) -> None:
    """Confirming an unknown candidate yields a 404 HTTPException."""
    with pytest.raises(HTTPException) as excinfo:
        await endcustomer_service.confirm_candidate(db_session, 999_999)

    assert excinfo.value.status_code == 404


async def test_reject_candidate_missing_raises_404(db_session: AsyncSession) -> None:
    """Rejecting an unknown candidate yields a 404 HTTPException."""
    with pytest.raises(HTTPException) as excinfo:
        await endcustomer_service.reject_candidate(db_session, 999_999)

    assert excinfo.value.status_code == 404

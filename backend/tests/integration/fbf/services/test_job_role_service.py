"""Integration tests for ``job_role_service``.

Public interface only: idempotent get-or-create, and the 404 guards on
delete/reassign against the real (container) database.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.services import job_role_service

pytestmark = pytest.mark.integration


async def test_get_or_create_by_name_creates_when_missing(db_session: AsyncSession) -> None:
    """A name without an existing role is created."""
    created = await job_role_service.get_or_create_by_name(db_session, "Data Engineer")

    assert created.name == "Data Engineer"


async def test_get_or_create_by_name_reuses_existing(db_session: AsyncSession) -> None:
    """A second call with the same name returns the same role."""
    first = await job_role_service.get_or_create_by_name(db_session, "Platform Engineer")
    second = await job_role_service.get_or_create_by_name(db_session, "Platform Engineer")

    assert second.id == first.id


async def test_delete_guarded_missing_raises_404(db_session: AsyncSession) -> None:
    """Deleting an unknown role yields a 404 HTTPException."""
    with pytest.raises(HTTPException) as excinfo:
        await job_role_service.delete_guarded(db_session, 999_999)

    assert excinfo.value.status_code == 404


async def test_reassign_projects_missing_source_raises_404(db_session: AsyncSession) -> None:
    """Reassigning from an unknown source role yields a 404 HTTPException."""
    with pytest.raises(HTTPException) as excinfo:
        await job_role_service.reassign_projects(db_session, 999_999, None)

    assert excinfo.value.status_code == 404

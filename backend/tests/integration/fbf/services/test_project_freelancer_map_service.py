"""Integration tests for project_freelancer_map_service (DB-backed).

These exercise the service against a real Postgres session because they cover
persistence and multi-table linkage – the unit level never touches the DB
(T-09, ``check-unit-no-db``). Covers:

- ``get_by_id`` / ``delete``: read and remove a raw PM entry
- ``unlink`` / ``switch_canonical`` / ``set_canonical``: 404 for unknown ids
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.services import project_freelancer_map_service

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def _seed_pm(db: AsyncSession, external_id: str, url: str) -> ProjectFreelancerMap:
    """Persist a minimal raw PM entry and return it with its id populated."""
    now = datetime.now(UTC)
    entry = ProjectFreelancerMap(
        external_id=external_id,
        url=url,
        title=f"Entry {external_id}",
        posted_at=now,
        scraped_at=now,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


# ── get_by_id / delete ───────────────────────────────────────────────────────


async def test_get_by_id_returns_entry_or_404(gjo_se_db_session: AsyncSession) -> None:
    """get_by_id returns the stored entry and raises 404 for an unknown id."""
    entry = await _seed_pm(gjo_se_db_session, "SVC_GET", "https://service-get.de/p")

    result = await project_freelancer_map_service.get_by_id(gjo_se_db_session, entry.id)
    assert result.title == "Entry SVC_GET"

    with pytest.raises(HTTPException) as exc_info:
        await project_freelancer_map_service.get_by_id(gjo_se_db_session, 99999)
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


async def test_delete_removes_entry(gjo_se_db_session: AsyncSession) -> None:
    """delete removes the entry so a subsequent read reports 404."""
    entry = await _seed_pm(gjo_se_db_session, "SVC_DEL", "https://service-del.de/p")

    await project_freelancer_map_service.delete(gjo_se_db_session, entry.id)

    with pytest.raises(HTTPException) as exc_info:
        await project_freelancer_map_service.get_by_id(gjo_se_db_session, entry.id)
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


# ── 404 paths of the canonical operations ────────────────────────────────────


async def test_unlink_unknown_entry_raises_404(gjo_se_db_session: AsyncSession) -> None:
    """unlink of an unknown PM id raises 404."""
    with pytest.raises(HTTPException) as exc_info:
        await project_freelancer_map_service.unlink(gjo_se_db_session, 99999)
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


async def test_switch_canonical_unknown_entry_raises_404(gjo_se_db_session: AsyncSession) -> None:
    """switch_canonical of an unknown PM id raises 404."""
    with pytest.raises(HTTPException) as exc_info:
        await project_freelancer_map_service.switch_canonical(gjo_se_db_session, 99999)
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


async def test_set_canonical_unknown_entry_raises_404(gjo_se_db_session: AsyncSession) -> None:
    """set_canonical of an unknown PM id raises 404."""
    with pytest.raises(HTTPException) as exc_info:
        await project_freelancer_map_service.set_canonical(gjo_se_db_session, 99999, None)
    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND

"""Integration tests for ``cronjob_repository`` against the container database.

Covers the CRUD core at the public interface: ``upsert`` (insert/update),
``get_by_key``, ``update_run_timestamps`` and the status-joined ``list_all``.
The repository commits inside ``upsert``/``update_run_timestamps``, so the file
runs in the serial ``db`` xdist group to avoid cross-worker visibility.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.job_scheduler.repositories import cronjob_repository
from app.shared.status.models.status import Status, Statusable

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def test_upsert_inserts_new_config(db_session: AsyncSession) -> None:
    """A missing key is inserted and returned as a record."""
    record = await cronjob_repository.upsert(db_session, "nightly_eval", "0 3 * * *")

    assert record.id is not None
    assert record.key == "nightly_eval"
    assert record.cron_expression == "0 3 * * *"


async def test_upsert_updates_existing_expression(db_session: AsyncSession) -> None:
    """Upserting an existing key updates the persisted cron expression."""
    await cronjob_repository.upsert(db_session, "nightly_eval", "0 3 * * *")

    updated = await cronjob_repository.upsert(db_session, "nightly_eval", "5 4 * * *")

    assert updated.cron_expression == "5 4 * * *"
    fetched = await cronjob_repository.get_by_key(db_session, "nightly_eval")
    assert fetched is not None
    assert fetched.cron_expression == "5 4 * * *"


async def test_get_by_key_returns_none_for_unknown_key(db_session: AsyncSession) -> None:
    """An unknown key yields no record."""
    assert await cronjob_repository.get_by_key(db_session, "unknown_job") is None


async def test_update_run_timestamps_persists_times(db_session: AsyncSession) -> None:
    """Run timestamps are persisted for an existing configuration."""
    await cronjob_repository.upsert(db_session, "nightly_eval", "0 3 * * *")
    last_run = datetime(2024, 1, 1, tzinfo=UTC)
    next_run = datetime(2024, 1, 2, tzinfo=UTC)

    await cronjob_repository.update_run_timestamps(db_session, "nightly_eval", last_run, next_run)

    fetched = await cronjob_repository.get_by_key(db_session, "nightly_eval")
    assert fetched is not None
    assert fetched.last_run_at == last_run
    assert fetched.next_run_at == next_run


async def test_list_all_joins_core_status(db_session: AsyncSession) -> None:
    """``list_all`` returns the config together with its joined core status."""
    config = await cronjob_repository.upsert(db_session, "nightly_eval", "0 3 * * *")
    status = Status(name="active", slug="cron-repo-active", category="cron", color_token="green")
    db_session.add(status)
    await db_session.flush()
    db_session.add(Statusable(status_id=status.id, statusable_type="core_cron_job_config", statusable_id=config.id))
    await db_session.flush()

    rows = await cronjob_repository.list_all(db_session)

    assert rows == [(config, "active", "green")]

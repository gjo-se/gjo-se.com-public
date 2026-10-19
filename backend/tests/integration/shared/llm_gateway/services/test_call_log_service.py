"""Integration tests for the central call-log query service."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.services.call_log_service import CallLogService


@pytest.mark.integration
async def test_list_recent_filters_by_task(db_session: AsyncSession) -> None:
    """A task filter limits the rows and the reported total."""
    db_session.add(CallLog(task="description-merge", call_type="text", success=True))
    db_session.add(CallLog(task="other-task", call_type="text", success=False, error_type="rate_limit"))
    await db_session.commit()

    rows, total = await CallLogService.list_recent(db_session, task="description-merge")

    assert total == 1
    assert [r.task for r in rows] == ["description-merge"]


@pytest.mark.integration
async def test_list_recent_only_errors_excludes_successes(db_session: AsyncSession) -> None:
    """The only_errors filter drops successful calls."""
    db_session.add(CallLog(task="description-merge", call_type="text", success=True))
    db_session.add(CallLog(task="description-merge", call_type="text", success=False, error_type="rate_limit"))
    await db_session.commit()

    rows, total = await CallLogService.list_recent(db_session, only_errors=True)

    assert total == 1
    assert rows[0].error_type == "rate_limit"


@pytest.mark.integration
async def test_stats_by_error_type_aggregates_success_and_errors(db_session: AsyncSession) -> None:
    """Stats split total into successes and per-error-type counts."""
    db_session.add(CallLog(task="description-merge", call_type="text", success=True))
    db_session.add(CallLog(task="description-merge", call_type="text", success=False, error_type="rate_limit"))
    await db_session.commit()

    stats = await CallLogService.stats_by_error_type(db_session)

    assert stats.total == 2
    assert stats.success == 1
    assert stats.errors == 1
    assert stats.by_error_type == {"rate_limit": 1}


@pytest.mark.integration
async def test_purge_older_than_keeps_promoted_rows(db_session: AsyncSession) -> None:
    """Retention purge deletes stale rows but never promoted dataset items."""
    old = datetime.now(UTC) - timedelta(days=30)
    db_session.add(CallLog(task="description-merge", call_type="text", success=True, created_at=old))
    db_session.add(
        CallLog(task="description-merge", call_type="text", success=True, created_at=old, promoted_to="golden")
    )
    await db_session.commit()

    deleted = await CallLogService.purge_older_than(db_session, days=14)

    assert deleted == 1


@pytest.mark.integration
async def test_mark_dead_sets_the_retry_status(db_session: AsyncSession) -> None:
    """Marking a row dead hands it to the dead-letter queue."""
    log = CallLog(task="description-merge", call_type="text", success=False, error_type="provider_error")
    db_session.add(log)
    await db_session.commit()

    updated = await CallLogService.mark_dead(db_session, log.id)

    assert updated is not None
    assert updated.retry_status == "dead"


@pytest.mark.integration
async def test_mark_dead_returns_none_for_unknown_row(db_session: AsyncSession) -> None:
    """Marking an unknown row is a no-op."""
    assert await CallLogService.mark_dead(db_session, 999_999) is None


@pytest.mark.integration
async def test_record_lands_row_in_container_via_bound_module_global_session(
    db_session: AsyncSession,
) -> None:
    """``record`` opens its own session and reaches the bound test database.

    ``CallLogService.record`` reads the module-global ``AsyncSessionLocal``
    directly. Without the central binding it would reach the unreachable
    placeholder ``DATABASE_URL`` and swallow the failure (returning ``None``).
    A non-``None`` id that is readable through the test session proves the
    module-global alias was rebound to the container database.
    """
    call_log_id = await CallLogService().record(
        task="description-merge",
        call_type="text",
        success=True,
    )

    assert call_log_id is not None
    row = await db_session.get(CallLog, call_log_id)
    assert row is not None
    assert row.task == "description-merge"

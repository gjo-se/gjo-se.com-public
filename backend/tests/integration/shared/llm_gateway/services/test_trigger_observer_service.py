"""Integration tests for the trigger-observer query service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.services.trigger_observer_service import TriggerObserverService


@pytest.mark.integration
async def test_trigger_stats_are_empty_for_an_unknown_task(db_session: AsyncSession) -> None:
    """An unknown task reports no allowed, observed or unused triggers."""
    stats = await TriggerObserverService().get_trigger_stats(db_session, "not-a-task")

    assert stats.allowed == []
    assert stats.observed == []
    assert stats.unused == []


@pytest.mark.integration
async def test_trigger_stats_separate_observed_from_unused(db_session: AsyncSession) -> None:
    """An observed trigger is counted and removed from the unused list."""
    db_session.add(CallLog(task="description-merge", call_type="text", success=True, trigger="button"))
    await db_session.commit()

    stats = await TriggerObserverService().get_trigger_stats(db_session, "description-merge")

    assert "button" in stats.allowed
    assert [o.trigger for o in stats.observed] == ["button"]
    assert stats.observed[0].count == 1
    assert "pipeline" in stats.unused
    assert "button" not in stats.unused


@pytest.mark.integration
async def test_latest_examples_are_empty_without_call_logs(db_session: AsyncSession) -> None:
    """Without call logs the input example is None."""
    examples = await TriggerObserverService().get_latest_examples(db_session, "description-merge")

    assert examples.input_example is None

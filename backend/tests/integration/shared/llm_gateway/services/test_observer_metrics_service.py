"""Integration tests for the observer metrics aggregation service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.services.observer_metrics_service import ObserverMetricsService


@pytest.mark.integration
async def test_compute_returns_empty_metrics_without_data(db_session: AsyncSession) -> None:
    """An empty call log yields empty task and timeline collections."""
    data = await ObserverMetricsService(db_session).compute("1h")

    assert data["tasks"] == []
    assert data["timeline"] == []


@pytest.mark.integration
async def test_compute_aggregates_durations_and_error_rate(db_session: AsyncSession) -> None:
    """Durations per task are aggregated into a percentile and error rate."""
    db_session.add(CallLog(task="description-merge", call_type="text", success=True, duration_ms=100))
    db_session.add(
        CallLog(task="description-merge", call_type="text", success=False, error_type="rate_limit", duration_ms=200)
    )
    await db_session.commit()

    data = await ObserverMetricsService(db_session).compute("6h")

    assert len(data["tasks"]) == 1
    task = data["tasks"][0]
    assert task["name"] == "description-merge"
    assert task["p50_ms"] == 100
    assert task["error_rate"] == pytest.approx(0.5)

"""Database access for trigger observation (llm_gateway).

Reads return :class:`TriggerObservationRecord` / plain snapshots so the service
layer stays free of ``app.shared.llm_gateway.models`` imports
(Achse 2: ``services`` > ``repositories``). The ``AsyncSession`` is passed in
by the caller (K3).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.trigger_observer_contract import TriggerObservationRecord
from app.shared.llm_gateway.models.call_log import CallLog


async def trigger_observations(db: AsyncSession, task_key: str) -> list[TriggerObservationRecord]:
    """Returns observed trigger aggregates for *task_key*, count descending."""
    stmt = (
        select(
            CallLog.trigger,
            func.count().label("observation_count"),
            func.min(CallLog.created_at).label("first_seen"),
            func.max(CallLog.created_at).label("last_seen"),
        )
        .where(CallLog.task == task_key, CallLog.trigger.is_not(None))
        .group_by(CallLog.trigger)
        .order_by(desc("observation_count"))
    )
    rows = (await db.execute(stmt)).all()
    return [
        TriggerObservationRecord(
            trigger=row.trigger,
            count=row.observation_count,
            first_seen=row.first_seen,
            last_seen=row.last_seen,
        )
        for row in rows
    ]


async def newest_input_snapshot(db: AsyncSession, task_key: str) -> dict[str, Any] | None:
    """Returns the ``input_snapshot`` of the newest call log for *task_key*."""
    newest = await db.scalar(
        select(CallLog).where(CallLog.task == task_key).order_by(desc(CallLog.created_at)).limit(1)
    )
    if newest is None:
        return None
    return newest.input_snapshot


async def newest_success_snapshot(db: AsyncSession, task_key: str) -> object | None:
    """Returns the ``input_snapshot`` (serialised result) of the newest successful call."""
    stmt = (
        select(CallLog)
        .where(
            CallLog.task == task_key,
            CallLog.success.is_(True),
        )
        .order_by(desc(CallLog.created_at))
        .limit(1)
    )
    success_row = await db.scalar(stmt)
    if success_row is None:
        return None
    return success_row.input_snapshot

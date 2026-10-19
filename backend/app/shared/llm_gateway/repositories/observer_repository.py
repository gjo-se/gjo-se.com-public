"""Database access for observer anomaly detection (llm_gateway).

Reads return :class:`CallLogRecord` domain objects or plain scalars so the
``Observer`` service stays free of ``app.shared.llm_gateway.models`` imports
(Achse 2: ``services`` > ``repositories``). The ``AsyncSession`` is passed in
by the caller (K3).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access import session as _db_session
from app.shared.llm_gateway.domain.call_log_contract import CallLogRecord
from app.shared.llm_gateway.models.call_log import CallLog
from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.price_snapshot import LLMModelPriceSnapshot
from app.shared.llm_gateway.repositories.call_log_repository import to_record

open_session = _db_session.open_session


async def list_recent_tasks(db: AsyncSession, cutoff: datetime) -> list[str]:
    """Returns all distinct task keys with data since *cutoff*."""
    stmt = select(CallLog.task).where(CallLog.created_at >= cutoff).distinct()
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def baseline_durations(
    db: AsyncSession,
    task: str,
    *,
    cutoff: datetime,
    recent_cutoff: datetime,
) -> list[int]:
    """Returns successful ``duration_ms`` values for *task* before *recent_cutoff*."""
    stmt = select(CallLog.duration_ms).where(
        CallLog.task == task,
        CallLog.success.is_(True),
        CallLog.duration_ms.is_not(None),
        CallLog.created_at >= cutoff,
        CallLog.created_at < recent_cutoff,
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all() if row[0] is not None]


async def recent_call_logs(db: AsyncSession, task: str, cutoff: datetime) -> list[CallLogRecord]:
    """Returns call-log records for *task* created since *cutoff*."""
    stmt = select(CallLog).where(
        CallLog.task == task,
        CallLog.created_at >= cutoff,
    )
    result = await db.execute(stmt)
    return [to_record(row) for row in result.scalars().all()]


async def hour_window_call_logs(
    db: AsyncSession,
    task: str,
    *,
    window_start: datetime,
    window_end: datetime,
) -> list[CallLogRecord]:
    """Returns call-log records for *task* within ``[window_start, window_end)``."""
    stmt = select(CallLog).where(
        CallLog.task == task,
        CallLog.created_at >= window_start,
        CallLog.created_at < window_end,
    )
    result = await db.execute(stmt)
    return [to_record(row) for row in result.scalars().all()]


async def resolve_price_per_1m(db: AsyncSession, resolved_model: str) -> tuple[float, float] | None:
    """Returns the latest ``(price_input, price_output)`` per 1M tokens for a model.

    Maps *resolved_model* to a model via ``openrouter_id`` OR ``native_model_id``
    and takes the newest snapshot by ``synced_at``.

    Returns:
        ``(price_input, price_output)``, or ``None`` if no model/snapshot exists.
    """
    stmt = (
        select(LLMModel.id)
        .where(
            or_(
                LLMModel.openrouter_id == resolved_model,
                LLMModel.native_model_id == resolved_model,
            )
        )
        .limit(1)
    )
    model_id = await db.scalar(stmt)
    if model_id is None:
        return None
    snapshot = await db.scalar(
        select(LLMModelPriceSnapshot)
        .where(LLMModelPriceSnapshot.model_id == model_id)
        .order_by(LLMModelPriceSnapshot.synced_at.desc())
        .limit(1)
    )
    if snapshot is None:
        return None
    return float(snapshot.price_input), float(snapshot.price_output)

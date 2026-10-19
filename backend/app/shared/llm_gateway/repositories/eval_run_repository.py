"""Database access for LLM evaluation runs (llm_gateway).

Operations return :class:`EvalRunRecord` domain objects (never ORM models) so
the service layer stays free of ``app.shared.llm_gateway.models`` imports
(Achse 2: ``services`` > ``repositories``). :func:`open_sample_session` hands
the service an isolated session factory (K3) for the parallel candidate runs.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access import session as _db_session
from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.domain.eval_run_contract import EvalRunRecord
from app.shared.llm_gateway.models.eval_run import EvalRun

open_session = _db_session.open_session


def _to_record(row: EvalRun) -> EvalRunRecord:
    """Maps an ``EvalRun`` ORM row to its domain record."""
    return EvalRunRecord(
        id=row.id,
        task=row.task,
        model_config_id=row.model_config_id,
        batch_id=row.batch_id,
        trigger=row.trigger,
        gate_results=row.gate_results,
        overall_status=row.overall_status,
        reviewer=row.reviewer,
        created_at=row.created_at,
    )


@asynccontextmanager
async def open_sample_session() -> AsyncGenerator[AsyncSession, None]:
    """Opens an isolated DB session for one evaluation candidate (K3).

    Yields:
        A fresh session bound to the module-global session factory.
    """
    async with AsyncSessionLocal() as session:
        yield session


async def create(
    db: AsyncSession,
    *,
    task: str,
    model_config_id: int | None,
    batch_id: str | None,
    trigger: str,
    gate_results: list[dict[str, Any]] | None,
    overall_status: str,
    reviewer: str | None,
) -> EvalRunRecord:
    """Persists a new evaluation run and returns its record."""
    run = EvalRun(
        task=task,
        model_config_id=model_config_id,
        batch_id=batch_id,
        trigger=trigger,
        gate_results=gate_results,
        overall_status=overall_status,
        reviewer=reviewer,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return _to_record(run)


async def create_running(
    db: AsyncSession,
    *,
    task: str,
    model_config_id: int | None,
    batch_id: str,
    trigger: str,
    reviewer: str,
) -> EvalRunRecord:
    """Persists a freshly started (``running``) evaluation run."""
    run = EvalRun(
        task=task,
        model_config_id=model_config_id,
        batch_id=batch_id,
        trigger=trigger,
        gate_results=[],
        overall_status="running",
        reviewer=reviewer,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return _to_record(run)


async def finalize(
    db: AsyncSession,
    run_id: int,
    *,
    gate_results: list[dict[str, Any]],
    overall_status: str,
) -> EvalRunRecord:
    """Persists the final gate results and overall status of an evaluation run."""
    run = await db.get(EvalRun, run_id)
    if run is None:
        raise LookupError(f"Eval run {run_id} not found")
    run.gate_results = gate_results
    run.overall_status = overall_status
    await db.commit()
    await db.refresh(run)
    return _to_record(run)


async def list_by_task(db: AsyncSession, task: str, limit: int = 50) -> list[EvalRunRecord]:
    """Returns evaluation runs for a task, newest first, as records."""
    stmt = select(EvalRun).where(EvalRun.task == task).order_by(desc(EvalRun.created_at)).limit(limit)
    result = await db.execute(stmt)
    return [_to_record(row) for row in result.scalars().all()]

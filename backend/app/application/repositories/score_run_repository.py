"""Database access for application score runs (gjo_se_com).

Reads and writes return ``ScoreRunOut`` DTOs (never ORM models) so the service
layer stays free of ``app.<ctx>.models`` imports (Achse 2: ``services`` >
``repositories``). The isolated sample session factory lives here too.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.models.score_run import ScoreRun
from app.application.schemas.score_schemas import ScoreRunOut
from app.shared.db_access.session import AsyncSessionLocal


def open_sample_session() -> AsyncSession:
    """Returns a fresh core DB session for one isolated LLM sample.

    The content scorer runs several samples in parallel; each sample needs its
    own session because the LLM client releases the caller's session once the
    call parameters are resolved. The session factory therefore lives in the
    data layer, not in the service.
    """
    return AsyncSessionLocal()


def _with_criteria():
    """Eager-loads the ``criteria`` relationship for serialization."""
    return selectinload(ScoreRun.criteria)


def _to_out(run: ScoreRun) -> ScoreRunOut:
    """Maps a score run ORM row to its DTO.

    The ``criteria`` relationship must already be eager-loaded by the caller
    (see :func:`_with_criteria`); the ``requirements`` column carries a Python
    default so an unfinalized run validates as an empty list.
    """
    return ScoreRunOut.model_validate(run)


async def create_run(
    db: AsyncSession,
    *,
    application_submission_id: int,
    project_id: int,
    weights_version: str,
) -> ScoreRunOut:
    """Builds and persists a new score run, returning its DTO."""
    run = ScoreRun(
        application_submission_id=application_submission_id,
        project_id=project_id,
        weights_version=weights_version,
    )
    db.add(run)
    await db.flush()
    created = await get_by_id(db, run.id)
    if created is None:
        raise RuntimeError("score run vanished after create")
    return created


async def finalize(
    db: AsyncSession,
    run_id: int,
    *,
    requirements: list[dict[str, object]],
    total_score: Decimal | None,
    verdict: str | None,
    llm_call_log_id: int | None,
    completed_at: datetime,
) -> ScoreRunOut:
    """Finalizes a run (``total_score``/``verdict``/``requirements``) and returns its DTO."""
    result = await db.execute(select(ScoreRun).options(_with_criteria()).where(ScoreRun.id == run_id))
    run = result.scalar_one_or_none()
    if run is None:
        raise RuntimeError("score run vanished before finalize")
    run.requirements = requirements
    run.total_score = total_score
    run.verdict = verdict
    run.llm_call_log_id = llm_call_log_id
    run.completed_at = completed_at
    await db.flush()
    return _to_out(run)


async def get_by_id(db: AsyncSession, run_id: int) -> ScoreRunOut | None:
    """Returns a single score run by id as DTO or None (criteria eager-loaded)."""
    result = await db.execute(select(ScoreRun).options(_with_criteria()).where(ScoreRun.id == run_id))
    run = result.scalar_one_or_none()
    return _to_out(run) if run is not None else None


async def get_latest_by_submission(db: AsyncSession, submission_id: int) -> ScoreRunOut | None:
    """Returns the most recent score run of a submission as DTO or None.

    Orders by ``created_at`` DESC with ``id`` DESC as tie-breaker: fast re-runs
    may share the same second, so the id decides the true latest run.
    """
    result = await db.execute(
        select(ScoreRun)
        .options(_with_criteria())
        .where(ScoreRun.application_submission_id == submission_id)
        .order_by(desc(ScoreRun.created_at), desc(ScoreRun.id))
        .limit(1)
    )
    run = result.scalar_one_or_none()
    return _to_out(run) if run is not None else None


async def get_latest_by_submissions(db: AsyncSession, submission_ids: list[int]) -> dict[int, ScoreRunOut]:
    """Returns the newest score run per submission id (single query, no N+1).

    Args:
        db: Active async DB session.
        submission_ids: application_submission ids.

    Returns:
        Mapping ``submission_id -> latest ScoreRunOut``; empty for empty input.
    """
    if not submission_ids:
        return {}
    result = await db.execute(
        select(ScoreRun)
        .options(_with_criteria())
        .where(ScoreRun.application_submission_id.in_(submission_ids))
        .order_by(
            ScoreRun.application_submission_id,
            desc(ScoreRun.created_at),
            desc(ScoreRun.id),
        )
    )
    latest: dict[int, ScoreRunOut] = {}
    for run in result.scalars().all():
        latest.setdefault(run.application_submission_id, _to_out(run))
    return latest


async def list_history_by_submission(db: AsyncSession, submission_id: int) -> list[ScoreRunOut]:
    """Returns the append-only score history of a submission, newest first.

    Orders by ``created_at`` DESC with ``id`` DESC as tie-breaker (no limit), so
    runs created within the same second keep a stable, deterministic order.
    """
    result = await db.execute(
        select(ScoreRun)
        .options(_with_criteria())
        .where(ScoreRun.application_submission_id == submission_id)
        .order_by(desc(ScoreRun.created_at), desc(ScoreRun.id))
    )
    return [_to_out(run) for run in result.scalars().all()]

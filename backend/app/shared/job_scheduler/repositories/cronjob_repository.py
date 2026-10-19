"""Database access for cron job configuration (gjo_se_com).

Read and write helpers return ``CronJobConfigRecord`` DTOs (never ORM models)
so the service layer stays free of ``app.shared.job_scheduler.models`` imports
(Achse 2: ``services`` > ``repositories``).
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.job_scheduler.domain.cron_job_config_contract import CronJobConfigRecord
from app.shared.job_scheduler.models.cron_job_config import CronJobConfig
from app.shared.status.models.status import Status, Statusable


def _to_record(config: CronJobConfig) -> CronJobConfigRecord:
    """Maps a ``CronJobConfig`` ORM row to its read record.

    Args:
        config: The loaded ORM configuration row.

    Returns:
        The service-boundary record.
    """
    return CronJobConfigRecord(
        id=config.id,
        key=config.key,
        cron_expression=config.cron_expression,
        last_run_at=config.last_run_at,
        next_run_at=config.next_run_at,
    )


async def list_all(db: AsyncSession) -> list[tuple[CronJobConfigRecord, str | None, str | None]]:
    """Return all cron job configurations with core status.

    Args:
        db: Database session.

    Returns:
        List of (config record, status_name, status_color_token) tuples.
    """
    stmt = (
        select(
            CronJobConfig,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "core_cron_job_config") & (Statusable.statusable_id == CronJobConfig.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
    )
    result = await db.execute(stmt)
    return [(_to_record(row[0]), row[1], row[2]) for row in result.all()]


async def get_by_key(db: AsyncSession, key: str) -> CronJobConfigRecord | None:
    """Return a single cron job config by key as a record."""
    result = await db.execute(select(CronJobConfig).where(CronJobConfig.key == key))
    config = result.scalar_one_or_none()
    return _to_record(config) if config is not None else None


async def upsert(
    db: AsyncSession,
    key: str,
    cron_expression: str | None = None,
) -> CronJobConfigRecord:
    """Insert or update a cron job configuration, returning its record."""
    result = await db.execute(select(CronJobConfig).where(CronJobConfig.key == key))
    config = result.scalar_one_or_none()
    if config is None:
        config = CronJobConfig(key=key, cron_expression=cron_expression or "")
        db.add(config)
    elif cron_expression is not None:
        config.cron_expression = cron_expression
    await db.commit()
    await db.refresh(config)
    return _to_record(config)


async def update_run_timestamps(
    db: AsyncSession,
    key: str,
    last_run_at: datetime,
    next_run_at: datetime | None,
) -> None:
    """Update timestamps after a job execution."""
    result = await db.execute(select(CronJobConfig).where(CronJobConfig.key == key))
    config = result.scalar_one_or_none()
    if config is None:
        return
    config.last_run_at = last_run_at
    config.next_run_at = next_run_at
    await db.commit()

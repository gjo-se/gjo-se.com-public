"""Router for Admin CronJob endpoints.

Provides read/update access to cron job configurations at runtime.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_gjo_se_db
from app.shared.job_scheduler.domain.cronjob_registry_rules import KNOWN_CRON_JOBS
from app.shared.job_scheduler.schemas.cron_job_config_schemas import (
    CronJobConfigOut,
    CronJobConfigUpdate,
)
from app.shared.job_scheduler.services.cronjob_service import CronJobService
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter(prefix="/cron-jobs")


@router.get("", response_model=list[CronJobConfigOut])
async def list_cron_jobs(
    request: Request,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[CronJobConfigOut]:
    """List all registered cron jobs with their DB configuration.

    Returns a merged response: Registry fields (display_name, description,
    default_cron, category) are always present; DB fields (cron_expression,
    is_active, last_run_at, next_run_at) reflect the persisted configuration
    or registry defaults.
    """
    service = CronJobService(registry=KNOWN_CRON_JOBS, job_funcs={})
    return await service.list_all(db)


@router.put("/{key}", response_model=CronJobConfigOut)
async def update_cron_job(
    key: str,
    data: CronJobConfigUpdate,
    request: Request,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CronJobConfigOut:
    """Update a cron job configuration.

    Validates that the key exists in the registry, persists the new
    cron_expression and/or is_active value, and reschedules the job
    via APScheduler (if scheduler is available in app state).
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    scheduler: AsyncIOScheduler | None = getattr(
        request.app.state,
        "cronjob_scheduler",
        None,
    )
    service = CronJobService(registry=KNOWN_CRON_JOBS, job_funcs={})
    if scheduler is None:
        # No scheduler in state – persist only, reschedule on next restart
        return await service.update_job(
            db,
            key,
            data,
            AsyncIOScheduler(),
        )
    return await service.update_job(db, key, data, scheduler)


@router.post("/{key}/execute", response_model=CronJobConfigOut)
async def execute_cron_job_now(
    key: str,
    request: Request,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CronJobConfigOut:
    """Execute a cron job immediately.

    Runs the job function synchronously, updates last_run_at / next_run_at
    timestamps in the database, and returns the updated configuration.
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from fastapi import HTTPException

    service: CronJobService | None = getattr(
        request.app.state,
        "cronjob_service",
        None,
    )
    scheduler: AsyncIOScheduler | None = getattr(
        request.app.state,
        "cronjob_scheduler",
        None,
    )

    if service is None:
        raise HTTPException(
            status_code=500,
            detail="CronJobService nicht im App-State verfuegbar",
        )
    if scheduler is None:
        raise HTTPException(
            status_code=500,
            detail="Scheduler nicht im App-State verfuegbar",
        )

    return await service.execute_now(db, key, scheduler)

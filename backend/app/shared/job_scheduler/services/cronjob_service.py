"""CronJob service – APScheduler integration.

Handles dynamic registration, rescheduling, and run-timestamp updates
for all jobs defined in the CronJob registry.
"""

import asyncio
import inspect
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import structlog
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED, JobExecutionEvent
from apscheduler.jobstores.base import JobLookupError
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.shared.db_access.session_types import AsyncSession
from app.shared.job_scheduler.domain.cron_job_config_contract import CronJobConfigRecord
from app.shared.job_scheduler.domain.cronjob_registry_rules import CronJobDefinition
from app.shared.job_scheduler.repositories.cronjob_repository import (
    get_by_key,
    list_all,
    update_run_timestamps,
    upsert,
)
from app.shared.job_scheduler.schemas.cron_job_config_schemas import (
    CronJobConfigOut,
    CronJobConfigUpdate,
)
from app.shared.status.repositories.statusable_repository import (
    get_status as get_core_status,
)

logger = structlog.get_logger(__name__)

# Strong references to fire-and-forget tasks (RUF006).
_BACKGROUND_TASKS: set[asyncio.Task[Any]] = set()

# Maximale Länge der im HTTP-Fehler zurückgegebenen Job-Fehlermeldung.
_MAX_ERROR_MESSAGE_LEN = 200


def _enrich_response(
    config: CronJobConfigRecord | None,
    definition: CronJobDefinition,
    status_name: str | None = None,
    status_color_token: str | None = None,
) -> CronJobConfigOut:
    """Merge a DB row with its registry definition into an API response."""
    return CronJobConfigOut(
        key=definition.key,
        id=config.id if config else None,
        cron_expression=config.cron_expression if config else definition.default_cron,
        last_run_at=config.last_run_at if config else None,
        next_run_at=config.next_run_at if config else None,
        display_name=definition.display_name,
        description=definition.description,
        default_cron=definition.default_cron,
        category=definition.category,
        status=status_name,
        status_color_token=status_color_token,
    )


async def _is_job_active(db: AsyncSession, key: str) -> bool:
    """Check if a cron job is active via core_statusable."""
    config = await get_by_key(db, key)
    if config is None:
        return True
    cs = await get_core_status(db, "core_cron_job_config", config.id)
    if cs is None:
        return True
    return cs.status.name == "active"


class CronJobService:
    """Manages APScheduler job registration and runtime updates."""

    def __init__(
        self,
        registry: list[CronJobDefinition],
        job_funcs: dict[str, Callable[[], object]],
    ) -> None:
        self.registry = registry
        self.job_funcs = job_funcs

    async def register_all(
        self,
        db: AsyncSession,
        scheduler: AsyncIOScheduler,
    ) -> None:
        """Register all known cron jobs with the scheduler.

        Status via core_statusable (core_cron_job_config).
        """
        for definition in self.registry:
            config = await get_by_key(db, definition.key)
            cron_expression = config.cron_expression if config and config.cron_expression else definition.default_cron
            is_active = await _is_job_active(db, definition.key)

            if is_active:
                job_func = self.job_funcs.get(definition.key)
                if job_func is None:
                    continue
                scheduler.add_job(
                    job_func,
                    CronTrigger.from_crontab(cron_expression),
                    id=definition.key,
                    replace_existing=True,
                )
            else:
                scheduler.add_job(
                    self._noop,
                    CronTrigger.from_crontab(cron_expression),
                    id=definition.key,
                    replace_existing=True,
                )
                scheduler.pause_job(definition.key)

        scheduler.add_listener(
            self._make_listener(db),
            EVENT_JOB_EXECUTED | EVENT_JOB_ERROR,
        )

    def _make_listener(
        self,
        db: AsyncSession,
    ) -> Callable[[JobExecutionEvent], None]:
        """Build a scheduler listener that persists run timestamps.

        Args:
            db: DB session used to persist the timestamps.

        Returns:
            A synchronous APScheduler listener bridging to the async writer.
        """

        async def update(event: JobExecutionEvent) -> None:
            """Persist the run timestamps for the fired job.

            Args:
                event: APScheduler execution event.
            """
            if event.job_id is None:
                return
            now = datetime.now(tz=UTC)
            next_time = event.scheduled_run_time if event.code == EVENT_JOB_EXECUTED else None
            await update_run_timestamps(db, event.job_id, now, next_time)

        def sync_listener(event: JobExecutionEvent) -> None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
            if loop.is_running():
                task = asyncio.ensure_future(update(event))
                _BACKGROUND_TASKS.add(task)
                task.add_done_callback(_BACKGROUND_TASKS.discard)
            else:
                loop.run_until_complete(update(event))

        return sync_listener

    async def update_job(
        self,
        db: AsyncSession,
        key: str,
        data: CronJobConfigUpdate,
        scheduler: AsyncIOScheduler,
    ) -> CronJobConfigOut:
        """Update a job's cron expression and active state.

        Persists the new expression, reschedules the live scheduler job
        (adding it back when reschedule fails) and returns the enriched config.

        Args:
            db: Active DB session.
            key: Registry key of the job to update.
            data: Requested update payload.
            scheduler: Running scheduler to reschedule against.

        Returns:
            The refreshed job configuration.

        Raises:
            HTTPException: If *key* is not a registered job.
        """
        from fastapi import HTTPException

        definition = next((d for d in self.registry if d.key == key), None)
        if definition is None:
            raise HTTPException(status_code=404, detail=f"Unbekannter Job: {key}")

        config = await upsert(db, key=key, cron_expression=data.cron_expression)

        effective_cron = config.cron_expression or definition.default_cron
        if not config.cron_expression:
            config = await upsert(db, key=key, cron_expression=definition.default_cron)

        is_active = await _is_job_active(db, key)

        try:
            scheduler.reschedule_job(key, trigger=CronTrigger.from_crontab(effective_cron))
            if is_active:
                scheduler.resume_job(key)
            else:
                scheduler.pause_job(key)
        except JobLookupError:
            job_func = self.job_funcs.get(key, self._noop)
            scheduler.add_job(job_func, CronTrigger.from_crontab(effective_cron), id=key, replace_existing=True)
            if not is_active:
                scheduler.pause_job(key)

        status_name = "active" if is_active else "inactive"
        status_color = "green" if is_active else "gray"
        return _enrich_response(config, definition, status_name, status_color)

    async def list_all(self, db: AsyncSession) -> list[CronJobConfigOut]:
        """List every registered job, merged with persisted config and status.

        Args:
            db: Active DB session.

        Returns:
            One enriched config per registry entry (defaults when unconfigured).
        """
        db_rows = await list_all(db)
        config_map = {row[0].key: row for row in db_rows}

        results: list[CronJobConfigOut] = []
        for definition in self.registry:
            row = config_map.get(definition.key)
            if row:
                config, sn, sc = row
                results.append(_enrich_response(config, definition, sn, sc))
            else:
                results.append(_enrich_response(None, definition))
        return results

    async def execute_now(
        self,
        db: AsyncSession,
        key: str,
        scheduler: AsyncIOScheduler,
    ) -> CronJobConfigOut:
        """Run a registered job immediately and report the outcome.

        Awaiting coroutine jobs directly, plain callables in an executor;
        failures are logged and surfaced on the returned config.

        Args:
            db: Active DB session.
            key: Registry key of the job to run.
            scheduler: Scheduler owning the job (used for next-run info).

        Returns:
            The refreshed job configuration including last/next run state.

        Raises:
            HTTPException: If *key* is unknown or has no registered function.
        """
        from fastapi import HTTPException

        definition = next((d for d in self.registry if d.key == key), None)
        if definition is None:
            raise HTTPException(status_code=404, detail=f"Unbekannter Job: {key}")

        job_func = self.job_funcs.get(key)
        if job_func is None:
            raise HTTPException(status_code=400, detail=f"Keine Funktion fuer Job '{key}' registriert")

        import asyncio

        job_error: Exception | None = None
        try:
            if inspect.iscoroutinefunction(job_func):
                await job_func()
            else:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, job_func)
        except Exception as exc:
            logger.exception("CronJob execution failed", job_key=key)
            job_error = exc

        now = datetime.now(tz=UTC)
        apscheduler_job = scheduler.get_job(key)
        next_time: datetime | None = apscheduler_job.next_run_time if apscheduler_job else None

        await update_run_timestamps(db, key, now, next_time)
        config = await get_by_key(db, key)

        if job_error is not None:
            error_msg = str(job_error)
            if len(error_msg) > _MAX_ERROR_MESSAGE_LEN:
                error_msg = f"{error_msg[:_MAX_ERROR_MESSAGE_LEN]}..."
            raise HTTPException(
                status_code=500,
                detail=f"Job '{key}' fehlgeschlagen: {error_msg}",
            )

        return _enrich_response(config, definition)

    @staticmethod
    def _noop() -> None:
        """No-op callable."""

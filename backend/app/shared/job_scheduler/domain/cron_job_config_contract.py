"""Frozen read record for cron job configuration (gjo_se_com).

The repository maps the ``CronJobConfig`` ORM row to this dataclass so the
service layer never imports ``app.shared.job_scheduler.models`` (Achse 2:
``services`` > ``repositories``; strict K2).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class CronJobConfigRecord:
    """Persisted cron job configuration as a service-boundary record.

    Attributes:
        id: Primary key of the config row.
        key: Unique registry key of the job.
        cron_expression: Persisted 5-field cron expression (may be empty).
        last_run_at: Timestamp of the last run, or ``None``.
        next_run_at: Scheduled timestamp of the next run, or ``None``.
    """

    id: int
    key: str
    cron_expression: str
    last_run_at: datetime | None
    next_run_at: datetime | None

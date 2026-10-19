"""Unit tests for the CronJobConfig persistence model metadata."""

from __future__ import annotations

import pytest

from app.shared.job_scheduler.models.cron_job_config import CronJobConfig

pytestmark = pytest.mark.unit


def test_cron_job_config_uses_expected_table_name() -> None:
    """The model maps to the shared_cron_job_config table."""
    assert CronJobConfig.__tablename__ == "shared_cron_job_config"


def test_cron_job_config_key_column_is_unique_and_not_nullable() -> None:
    """The registry key column is unique and required."""
    column = CronJobConfig.__table__.c.key

    assert column.unique is True
    assert column.nullable is False


def test_cron_job_config_inherits_timestamp_columns() -> None:
    """The model exposes the mixin's created_at/updated_at columns."""
    table = CronJobConfig.__table__

    assert "created_at" in table.c
    assert "updated_at" in table.c

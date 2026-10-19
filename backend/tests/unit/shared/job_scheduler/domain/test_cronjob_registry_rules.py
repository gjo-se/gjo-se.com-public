"""Unit tests for the cron-job registry (scheduled jobs SSOT)."""

from __future__ import annotations

import dataclasses

import pytest

from app.shared.job_scheduler.domain.cronjob_registry_rules import KNOWN_CRON_JOBS

pytestmark = pytest.mark.unit


def test_known_cron_jobs_keys_are_unique() -> None:
    """Every registered cron job has a unique code-binding key."""
    keys = [job.key for job in KNOWN_CRON_JOBS]

    assert len(keys) == len(set(keys))


def test_default_cron_expressions_have_five_fields() -> None:
    """Every default cron expression is a valid 5-field expression."""
    for job in KNOWN_CRON_JOBS:
        assert len(job.default_cron.split()) == 5, job.key


def test_freelancermap_scraper_is_registered_in_aiscope_category() -> None:
    """The freelancermap scraper is a known aiscope-category job."""
    job = next(j for j in KNOWN_CRON_JOBS if j.key == "freelancermap_scraper")

    assert job.category == "aiscope"
    assert job.default_cron == "0 2 * * *"


def test_cron_job_definition_is_immutable() -> None:
    """The code-known registry entries cannot be mutated at runtime."""
    job = KNOWN_CRON_JOBS[0]

    with pytest.raises(dataclasses.FrozenInstanceError):
        job.__setattr__("key", "changed")

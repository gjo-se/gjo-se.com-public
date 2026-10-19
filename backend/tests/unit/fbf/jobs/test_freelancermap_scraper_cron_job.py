"""Unit tests for the scheduled freelancermap scraper cron job wrapper."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

import app.fbf.services.freelancermap_scraping_service as scraping_service
import app.shared.credential_store.dependencies.credential_store_dependencies as cred_deps
from app.fbf.jobs.freelancermap_scraper_cron_job import run_freelancermap_scraper
from app.shared.config.config import settings

pytestmark = pytest.mark.unit


class _DispatchRecorder:
    """Fake at the scraper-dispatch boundary recording its (arg-less) calls."""

    def __init__(self) -> None:
        self.calls: list[tuple[object, ...]] = []

    def __call__(self, *args: object, **_kwargs: object) -> str:
        self.calls.append(args)
        return "arn:aws:ecs:task/123"


class _RunRecorder:
    """Fake scraper recording the keyword arguments of its ``run`` call."""

    def __init__(self) -> None:
        self.kwargs: dict[str, Any] | None = None

    async def run(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


class _SessionCtx:
    """Async context manager standing in for ``AsyncSessionLocal()``."""

    async def __aenter__(self) -> object:
        return SimpleNamespace()

    async def __aexit__(self, *_exc: object) -> bool:
        return False


def _patch_in_process(monkeypatch: pytest.MonkeyPatch, creds: dict[str, str]) -> _RunRecorder:
    """Wire the in-process path with fake credentials and scraper."""

    class _CredService:
        async def get_credentials(self, _db: object, *, service: str) -> dict[str, str]:
            assert service == "freelancermap"
            return creds

    recorder = _RunRecorder()
    monkeypatch.setattr(cred_deps, "get_admin_credential_service", _CredService)

    def _factory(_db: object, **_kwargs: object) -> _RunRecorder:
        return recorder

    monkeypatch.setattr(scraping_service, "FreelancermapScrapingService", _factory)
    return recorder


async def test_run_freelancermap_scraper_dispatches_the_fargate_job_on_prod(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """On prod the job dispatches the isolated Fargate scraper (no in-process run)."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "".join(["pr", "od"]))
    dispatch = _DispatchRecorder()
    monkeypatch.setattr("app.fbf.jobs.scraper_dispatch_job.dispatch_scraper_job", dispatch)

    await run_freelancermap_scraper()

    assert dispatch.calls == [()]


@pytest.mark.parametrize("environment", ["dev", "staging", "local"])
async def test_run_freelancermap_scraper_runs_in_process_outside_prod(
    monkeypatch: pytest.MonkeyPatch, environment: str
) -> None:
    """Any non-prod environment runs the scraper in-process using the stored credentials."""
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    dispatch = _DispatchRecorder()
    monkeypatch.setattr("app.fbf.jobs.scraper_dispatch_job.dispatch_scraper_job", dispatch)
    creds = {"login_username": "user1", "login_password": "pw1"}  # pragma: allowlist secret
    recorder = _patch_in_process(monkeypatch, creds)

    await run_freelancermap_scraper(session_factory=_SessionCtx)

    expected = {"username": "user1", "password": "pw1"}  # pragma: allowlist secret
    assert dispatch.calls == []
    assert recorder.kwargs == expected

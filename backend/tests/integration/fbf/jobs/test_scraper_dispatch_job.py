"""Integration tests for the ECS scraper job dispatcher.

``dispatch_scraper_job`` resolves the non-secret ECS/network config from the
environment, forwards the run options as container overrides and starts the
Fargate task. The AWS boundary is a deterministic boto3 double recording the
``ecs:RunTask`` call, so no AWS call leaves the process.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.fbf.jobs import scraper_dispatch_job

pytestmark = pytest.mark.integration

_ENV = {
    "SCRAPER_CLUSTER": "gjo-se-prod-cluster",
    "SCRAPER_TASK_DEFINITION": "gjo-se-prod-scraper",
    "SCRAPER_REGION": "eu-central-1",
    "SCRAPER_PUBLIC_SUBNETS": "subnet-a,subnet-b",
    "SCRAPER_SECURITY_GROUPS": "sg-123",
}
_TASK_ARN = "arn:aws:ecs:eu-central-1:000000000000:task/abc"


class _FakeEcsClient:
    """boto3 ECS double recording ``run_task`` calls and returning a canned response."""

    def __init__(self, response: dict[str, Any]) -> None:
        """Store the canned ``run_task`` response."""
        self.response = response
        self.calls: list[dict[str, Any]] = []

    def run_task(self, **kwargs: Any) -> dict[str, Any]:
        """Record the run_task kwargs and return the canned response."""
        self.calls.append(kwargs)
        return self.response


def _install_fake_ecs(monkeypatch: pytest.MonkeyPatch, response: dict[str, Any]) -> _FakeEcsClient:
    """Replace the boto3 ECS client factory with a recording double."""
    fake = _FakeEcsClient(response)
    monkeypatch.setattr(scraper_dispatch_job.boto3, "client", lambda *_args, **_kwargs: fake)
    return fake


def _set_scraper_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Inject the non-secret ECS/network config into the environment."""
    for key, value in _ENV.items():
        monkeypatch.setenv(key, value)


async def test_dispatch_starts_task_and_forwards_resolved_config(monkeypatch: pytest.MonkeyPatch) -> None:
    """The dispatcher returns the task ARN and forwards config + run options."""
    _set_scraper_env(monkeypatch)
    fake = _install_fake_ecs(monkeypatch, {"tasks": [{"taskArn": _TASK_ARN}]})

    task_arn = scraper_dispatch_job.dispatch_scraper_job(force_full=True, max_results=5, since_days=10)

    assert task_arn == _TASK_ARN
    (call,) = fake.calls
    assert call["cluster"] == "gjo-se-prod-cluster"
    assert call["taskDefinition"] == "gjo-se-prod-scraper"
    assert call["launchType"] == "FARGATE"
    awsvpc = call["networkConfiguration"]["awsvpcConfiguration"]
    assert awsvpc["subnets"] == ["subnet-a", "subnet-b"]
    assert awsvpc["securityGroups"] == ["sg-123"]
    assert awsvpc["assignPublicIp"] == "ENABLED"
    overrides = call["overrides"]["containerOverrides"][0]
    assert overrides["name"] == "scraper"
    assert overrides["environment"] == [
        {"name": "SCRAPER_FORCE_FULL", "value": "true"},
        {"name": "SCRAPER_MAX_RESULTS", "value": "5"},
        {"name": "SCRAPER_SINCE_DAYS", "value": "10"},
    ]


async def test_dispatch_omits_optional_limits_when_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without explicit limits the dispatcher forwards only the force-full flag."""
    _set_scraper_env(monkeypatch)
    fake = _install_fake_ecs(monkeypatch, {"tasks": [{"taskArn": _TASK_ARN}]})

    scraper_dispatch_job.dispatch_scraper_job()

    (call,) = fake.calls
    env = call["overrides"]["containerOverrides"][0]["environment"]
    assert env == [{"name": "SCRAPER_FORCE_FULL", "value": "false"}]


async def test_dispatch_requires_the_injected_ecs_config(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing SCRAPER_* variable aborts before any AWS call."""
    for key in _ENV:
        monkeypatch.delenv(key, raising=False)
    fake = _install_fake_ecs(monkeypatch, {"tasks": [{"taskArn": _TASK_ARN}]})

    with pytest.raises(RuntimeError):
        scraper_dispatch_job.dispatch_scraper_job()

    assert fake.calls == []


async def test_dispatch_raises_on_placement_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """An ``ecs:RunTask`` placement failure is surfaced as a RuntimeError."""
    _set_scraper_env(monkeypatch)
    _install_fake_ecs(monkeypatch, {"failures": [{"reason": "RESOURCE:CPU"}]})

    with pytest.raises(RuntimeError):
        scraper_dispatch_job.dispatch_scraper_job()


async def test_dispatch_raises_when_no_task_is_started(monkeypatch: pytest.MonkeyPatch) -> None:
    """A response without tasks is surfaced as a RuntimeError."""
    _set_scraper_env(monkeypatch)
    _install_fake_ecs(monkeypatch, {"tasks": []})

    with pytest.raises(RuntimeError):
        scraper_dispatch_job.dispatch_scraper_job()

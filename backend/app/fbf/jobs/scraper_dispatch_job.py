"""Dispatch des AIScope-Scraper-Fargate-Jobs aus dem always-on API.

Der always-on API startet den isolierten Scraper-RunTask (``gjo-se-prod-scraper``)
per ``ecs:RunTask`` statt ihn in-process auszuführen. Die Netz-/Target-Config
(Cluster, Task-Def, Subnetze, SG, Region) kommt aus Nicht-Secret-SSM
(ssm-config.tf → in den API-Env injiziert), damit der API-Container die
awsvpc-Netzparameter des RunTasks kennt. Der Job beendet sich selbst per
Exit-Code 0/1; Zählungen (new/archiviert) liegen danach in DB + CloudWatch.

Image: ``dev_deploy`` registriert bei jedem BE-Rollout auch eine neue Revision der
Scraper-Familie mit dem deployten Release-Image (RunTask kann kein Image-Override).
Der Dispatcher referenziert daher nur die Familien-Rev (neueste aktive Revision) –
kein ``:latest``-Risiko, kein Image-Pinning im RunTask nötig.
"""

from __future__ import annotations

import os
from typing import Any, NamedTuple

import boto3
import structlog
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

logger = structlog.get_logger(__name__)

_ECS_RETRY = Config(retries={"max_attempts": 3, "mode": "standard"})


class _EcsConfig(NamedTuple):
    """Resolved, non-secret ECS/network config for the scraper RunTask."""

    cluster: str
    task_definition: str
    region: str
    subnets: list[str]
    security_group: str


def _load_ecs_config() -> _EcsConfig:
    """Read the ECS/network config injected from SSM into the API environment.

    Raises:
        RuntimeError: if a required ``SCRAPER_*`` variable is missing.
    """
    cluster = os.environ.get("SCRAPER_CLUSTER")
    task_def = os.environ.get("SCRAPER_TASK_DEFINITION")
    region = os.environ.get("SCRAPER_REGION", "eu-central-1")
    subnets_raw = os.environ.get("SCRAPER_PUBLIC_SUBNETS", "")
    sg = os.environ.get("SCRAPER_SECURITY_GROUPS", "")

    if not cluster or not task_def or not subnets_raw or not sg:
        logger.error(
            "dispatch_scraper_job: missing ECS/network config – "
            "SCRAPER_CLUSTER/TASK_DEFINITION/PUBLIC_SUBNETS/SECURITY_GROUPS required"
        )
        raise RuntimeError("Scraper-Job-Dispatch: ECS-Config fehlt (Nicht-Secret-SSM).")

    subnets = [s for s in subnets_raw.split(",") if s]
    return _EcsConfig(cluster, task_def, region, subnets, sg)


def _build_environment(force_full: bool, max_results: int | None, since_days: int | None) -> list[dict[str, str]]:
    """Build the container environment overrides forwarded to the scraper job."""
    env: list[dict[str, str]] = [
        {"name": "SCRAPER_FORCE_FULL", "value": "true" if force_full else "false"},
    ]
    if max_results is not None:
        env.append({"name": "SCRAPER_MAX_RESULTS", "value": str(max_results)})
    if since_days is not None:
        env.append({"name": "SCRAPER_SINCE_DAYS", "value": str(since_days)})
    return env


def _run_task(config: _EcsConfig, env: list[dict[str, str]]) -> dict[str, Any]:
    """Start the Fargate task and return the raw ``ecs:RunTask`` response.

    Raises:
        RuntimeError: if ``ecs:RunTask`` fails.
    """
    try:
        client = boto3.client("ecs", region_name=config.region, config=_ECS_RETRY)
        return client.run_task(
            cluster=config.cluster,
            taskDefinition=config.task_definition,
            launchType="FARGATE",
            networkConfiguration={
                "awsvpcConfiguration": {
                    "subnets": config.subnets,
                    "securityGroups": [config.security_group],
                    "assignPublicIp": "ENABLED",
                }
            },
            overrides={
                "containerOverrides": [
                    {
                        "name": "scraper",
                        "environment": env,
                    }
                ]
            },
        )
    except (ClientError, BotoCoreError) as exc:
        logger.exception(
            "dispatch_scraper_job: ecs run_task failed cluster=%s task=%s",
            config.cluster,
            config.task_definition,
        )
        raise RuntimeError(f"Scraper-Job-Dispatch fehlgeschlagen: {exc}") from exc


def dispatch_scraper_job(
    *,
    force_full: bool = False,
    max_results: int | None = None,
    since_days: int | None = None,
) -> str:
    """Start the scraper Fargate job once and return its ECS task ARN.

    Args:
        force_full: Forward as ``SCRAPER_FORCE_FULL`` to the job.
        max_results: Forward as ``SCRAPER_MAX_RESULTS`` to the job.
        since_days: Forward as ``SCRAPER_SINCE_DAYS`` to the job (bounded backfill).

    Returns:
        The ECS task ARN of the started run.

    Raises:
        RuntimeError: if ``ecs:RunTask`` fails or the placement produces no task
            (log + re-raise for the caller to map to an HTTP error / cron failure).
    """
    config = _load_ecs_config()
    env = _build_environment(force_full, max_results, since_days)
    resp = _run_task(config, env)

    failures = resp.get("failures", [])
    if failures:
        reason = failures[0].get("reason", "unknown")
        logger.error("dispatch_scraper_job: run_task placement failures=%s", failures)
        raise RuntimeError(f"Scraper-Job-Dispatch: Placement fehlgeschlagen: {reason}")

    tasks = resp.get("tasks", [])
    if not tasks:
        raise RuntimeError("Scraper-Job-Dispatch: RunTask gab keine Tasks zurück.")

    task_arn = tasks[0]["taskArn"]
    logger.info("dispatch_scraper_job: started task_arn=%s force_full=%s", task_arn, force_full)
    return task_arn

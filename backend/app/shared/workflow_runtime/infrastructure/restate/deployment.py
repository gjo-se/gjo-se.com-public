"""Restate deployment lifecycle — registration, flow-control, invocation cleanup.

Registers the backend/worker deployments with Restate and applies flow-control
rules and stale-invocation cleanup. Split out of :mod:`client` – deployment
lifecycle is a distinct concern from dispatch and state queries.
"""

from __future__ import annotations

import asyncio

import httpx
import structlog

from app.shared.config.config import settings
from app.shared.workflow_runtime.infrastructure.restate.client import get_restate_client

logger = structlog.get_logger(__name__)


async def register_deployment(*, delay: float = 3.0) -> bool:
    """Register backend (workflows) and worker (activities) with Restate.

    Registers two separate deployments so that workflow handlers run on
    the API process (port 8000) and activity handlers run on the dedicated
    worker process (port 9080).  Both use ``force=True`` to override cached
    deployments and trigger fresh service discovery.

    Designed to run as a background task — ``delay`` seconds after the
    lifespan ``yield`` so uvicorn has opened its HTTP socket.

    Args:
        delay: Seconds to wait before attempting registration (default 3).

    Returns:
        ``True`` if both registrations succeeded.
    """
    await asyncio.sleep(delay)

    deployments: list[tuple[str, str]] = [
        ("backend", settings.RESTATE_DEPLOY_BACKEND_URL),
        ("worker", settings.RESTATE_DEPLOY_WORKER_URL),
    ]

    client = get_restate_client()
    all_succeeded = True

    for label, uri in deployments:
        try:
            response = await client.post(
                f"{settings.RESTATE_URL}/deployments",
                json={
                    "uri": uri,
                    "use_http_11": True,
                    "force": True,
                },
                timeout=15.0,
            )
            if response.is_success:
                dep = response.json()
                svc_names = [s["name"] for s in dep.get("services", [])]
                logger.info(
                    "Restate %s deployment registered – id: %s (%d services: %s)",
                    label,
                    dep.get("id", "?"),
                    len(svc_names),
                    ", ".join(svc_names),
                )
            else:
                logger.warning(
                    "Restate %s deployment registration returned %s: %s",
                    label,
                    response.status_code,
                    response.text,
                )
                all_succeeded = False
        except httpx.HTTPError:
            logger.warning(
                "Restate %s deployment registration failed – runtime not reachable at %s",
                label,
                settings.RESTATE_URL,
                exc_info=True,
            )
            all_succeeded = False

    if not all_succeeded:
        return False

    # Set flow-control rules (concurrency limits per scope)
    await _set_flow_control_rules(client)

    # Kill stale invocations (prevents VMException 570 loops)
    await _kill_inflight_invocations(client)

    return True


async def _kill_inflight_invocations(client: httpx.AsyncClient) -> None:
    """Kill all in-flight invocations to prevent journal-mismatch loops.

    After a ``force`` re-registration, old invocations may have journals
    that don't match the new code path.  Restate retries them forever,
    producing VMException 570.  Killing them lets new invocations start
    fresh.
    """
    try:
        resp = await client.post(
            f"{settings.RESTATE_URL}/query",
            json={
                "query": (
                    "SELECT id FROM sys_invocation "
                    "WHERE status IN ('queued', 'scheduled', 'inboxed', 'paused', 'backing-off')"
                ),
            },
            headers={"Accept": "application/json"},
        )
        if not resp.is_success:
            logger.debug(
                "Restate invocation query returned %s – skipping cleanup",
                resp.status_code,
            )
            return

        rows = resp.json().get("rows", [])
        if not rows:
            return

        killed = 0
        for row in rows:
            inv_id = row.get("id") if isinstance(row, dict) else row[0]
            if not inv_id:
                continue
            kill_resp = await client.patch(
                f"{settings.RESTATE_URL}/invocations/{inv_id}/kill",
            )
            if kill_resp.is_success:
                killed += 1

        if killed:
            logger.info("Restate: killed %d stale invocations", killed)
    except httpx.HTTPError:
        logger.debug("Restate invocation cleanup failed", exc_info=True)


async def _set_flow_control_rules(client: httpx.AsyncClient) -> None:
    """Apply Restate flow-control rules for all configured scopes.

    Sets the concurrency limit for the ``merge-bulk`` scope via the
    Restate Admin API ``PUT /rules`` endpoint.  Flow control only takes
    effect when ``RESTATE_EXPERIMENTAL_ENABLE_PROTOCOL_V7=true`` is set
    on the Restate container.
    """
    concurrency = settings.RESTATE_MERGE_BULK_CONCURRENCY
    try:
        resp = await client.put(
            f"{settings.RESTATE_URL}/limits/rules",
            json=[
                {
                    "pattern": "merge-bulk/*",
                    "description": "Bulk-Merge concurrency limit",
                    "limits": {"concurrency": concurrency},
                },
            ],
            timeout=10.0,
        )
        if resp.is_success:
            logger.info(
                "Restate flow-control rule set: scope=merge-bulk concurrency=%d",
                concurrency,
            )
        else:
            logger.warning(
                "Restate flow-control rule returned %d: %s",
                resp.status_code,
                resp.text[:500],
            )
    except httpx.HTTPError:
        logger.warning(
            "Restate flow-control rule set failed",
            exc_info=True,
        )

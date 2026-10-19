"""Restate HTTP client core — shared connection, health probes, deployment reads.

Owns the module-level shared ``httpx.AsyncClient`` so all Restate calls reuse
the same connection pool — critical for bulk operations that fire many parallel
workflow invocations. The dispatch/enqueue wrappers live in :mod:`dispatch`,
deployment lifecycle in :mod:`deployment`, and the SQL state queries in
:mod:`query`.
"""

from __future__ import annotations

import httpx
import structlog

from app.shared.config.config import settings

logger = structlog.get_logger(__name__)


_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0))


def get_restate_client() -> httpx.AsyncClient:
    """Return the shared Restate HTTP client (single connection pool)."""
    return _client


async def close_restate_client() -> None:
    """Close the shared Restate HTTP client (call on app shutdown)."""
    await _client.aclose()
    logger.debug("Restate HTTP client closed")


async def restate_ingress_healthy() -> bool:
    """Probe whether the Restate ingress is reachable (workflows invocable).

    Uses the same health path as the Restate container healthcheck
    (``/restate/health``) on the ingress URL. ``True`` means invocation would
    succeed; ``False`` covers connect/timeout/non-2xx.
    """
    try:
        response = await _client.get(
            f"{settings.RESTATE_INGRESS_URL}/restate/health",
            timeout=4.0,
        )
        return response.is_success
    except httpx.HTTPError:
        logger.debug("Restate ingress health probe failed", exc_info=True)
        return False


async def has_inflight_invocations() -> bool:
    """Return ``True`` if Restate still has queued/running invocations.

    Used by the idle-reaper: only scale down when no workflow is active, so
    running merges are never interrupted.
    """
    try:
        response = await _client.post(
            f"{settings.RESTATE_URL}/query",
            json={
                "query": (
                    "SELECT count(*) FROM sys_invocation "
                    "WHERE status IN ('queued', 'scheduled', 'inboxed', 'paused', 'backing-off', 'running')"
                ),
            },
            headers={"Accept": "application/json"},
            timeout=10.0,
        )
        if not response.is_success:
            return True  # nicht prüfbar => konservativ nicht runterfahren
        rows = response.json().get("rows", [])
        if not rows:
            return False
        first = rows[0]
        count = first[0] if isinstance(first, list) else first.get("count", 0)
        return int(count) > 0
    except (httpx.HTTPError, ValueError, AttributeError, TypeError):
        logger.debug("Restate inflight-invocation query failed", exc_info=True)
        return True


async def get_deployment_id() -> str | None:
    """Return the currently active deployment id, if any."""
    url = f"{settings.RESTATE_URL}/deployments"
    try:
        response = await _client.get(url, timeout=5.0)
        if response.is_success:
            data = response.json()
            deployments: list[dict[str, object]] = data.get("deployments", [])
            if deployments:
                deployment_id = deployments[0].get("id")
                return deployment_id if isinstance(deployment_id, str) else None
    except Exception:
        logger.exception("Failed to query Restate deployments")
    return None


async def restate_deployments_registered() -> bool:
    """Return ``True`` if both configured deployment URIs are registered.

    Queries ``GET {RESTATE_URL}/deployments`` and checks that the URIs from
    ``RESTATE_DEPLOY_BACKEND_URL`` and ``RESTATE_DEPLOY_WORKER_URL`` are both
    present in Restate's ``deployments`` list (field ``uri``). On any HTTP
    error or exception it conservatively returns ``False`` so the caller
    retries registration — which is idempotent (``force=True``).
    """
    try:
        response = await _client.get(
            f"{settings.RESTATE_URL}/deployments",
            timeout=5.0,
        )
        if not response.is_success:
            logger.warning(
                "Restate deployments query returned %s: %s",
                response.status_code,
                response.text[:500],
            )
            return False
        deployments: list[dict[str, object]] = response.json().get("deployments", [])
        registered_uris = {dep.get("uri") for dep in deployments}
        return (
            settings.RESTATE_DEPLOY_BACKEND_URL in registered_uris
            and settings.RESTATE_DEPLOY_WORKER_URL in registered_uris
        )
    except (httpx.HTTPError, ValueError, AttributeError, TypeError):
        logger.warning("Restate deployments query failed", exc_info=True)
        return False


async def set_retry_job_id(call_log_id: int, job_id: str, attempt: int) -> None:
    """Stub — associates a retry job id with the original call log.

    Previously wrote to Redis (``call_log:{id}:retry_job``). Not needed
    with Restate as workflow state tracks this natively.
    """
    logger.debug(
        "set_retry_job_id: call_log=%d job_id=%s attempt=%d (no-op with Restate)",
        call_log_id,
        job_id,
        attempt,
    )

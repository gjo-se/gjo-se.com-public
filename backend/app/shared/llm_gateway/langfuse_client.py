"""LangFuse client singleton – lazy-initialised with graceful degradation.

The client reads ``LANGFUSE_HOST``, ``LANGFUSE_PUBLIC_KEY``, and
``LANGFUSE_SECRET_KEY`` from pydantic :class:`Settings`. If any required
variable is missing, the client is set to ``None`` and all calls become
no-ops, so LLM operations never fail because of missing LangFuse
configuration.

When LangFuse *is* configured but unreachable (container down), the
client initialises but marks itself unhealthy.  Prompt resolution and
OTEL export will then fail fast with a clear error instead of flooding
call-logs with opaque ``[Errno 111] Connection refused`` entries.

Robustness guarantees:

* **Race-free initialisation** – the client creation *and* the first
  health probe happen atomically under a lock.  Concurrent first callers
  block until the probe finished, so they never observe the ``_healthy``
  default and report a false ``langfuse_unreachable``.
* **Self-healing** – the health result is cached for ``_HEALTH_TTL_SECONDS``
  only.  Once stale it is re-probed, so a temporary outage recovers without
  a backend restart.
"""

from __future__ import annotations

import threading
import time
from typing import TYPE_CHECKING

import httpx
import structlog

from app.shared.config.config import settings

if TYPE_CHECKING:
    from langfuse import Langfuse

logger = structlog.get_logger(__name__)

_langfuse: Langfuse | None = None
_healthy: bool = False
_initialised: bool = False
_health_checked_at: float = 0.0

# Serialises client creation + health probe.  Guards against concurrent
# first callers racing on the ``_healthy`` default value.
_lock = threading.Lock()

# How long a health result is trusted before it is re-probed.  Bounds the
# recovery latency after a temporary LangFuse outage and avoids an HTTP
# round-trip on every single LLM call.
_HEALTH_TTL_SECONDS = 30.0

_HEALTH_PROBE_TIMEOUT_SECONDS = 3.0


def _is_configured() -> bool:
    """Check whether all required LangFuse settings are present."""
    return bool(settings.LANGFUSE_HOST or settings.LANGFUSE_BASE_URL) and bool(settings.LANGFUSE_PUBLIC_KEY)


def _health_url() -> str:
    """Return the LangFuse health endpoint derived from settings."""
    return f"{settings.LANGFUSE_HOST or settings.LANGFUSE_BASE_URL}/api/public/health"


def is_langfuse_healthy() -> bool:
    """Return ``True`` when LangFuse is configured AND reachable.

    Safe to call before the client is initialised — returns ``False``
    until :func:`get_langfuse_client` has completed its health check.
    A reachable probe without configuration is impossible, so the
    configuration predicate is an explicit precondition of health.
    """
    return _is_configured() and _healthy


def _probe_health() -> bool:
    """Probe the LangFuse API once and return whether it responded.

    Never raises: any connection error or timeout is logged and mapped
    to ``False``.
    """
    try:
        response = httpx.get(_health_url(), timeout=_HEALTH_PROBE_TIMEOUT_SECONDS)
        response.raise_for_status()
    except (httpx.HTTPError, OSError, ValueError):
        logger.critical(
            "LangFuse nicht erreichbar unter %s — "
            "ALLE LLM-Calls werden fehlschlagen! "
            "Container starten: docker compose -f docker-compose.langfuse.yml up -d",
            settings.LANGFUSE_HOST or settings.LANGFUSE_BASE_URL,
        )
        return False

    logger.info("LangFuse health check passed.")
    return True


def _initialise_unlocked() -> None:
    """Create the client and run the initial health probe.

    Caller MUST hold :data:`_lock`.  Sets ``_initialised`` only after the
    health state is fully resolved, so no concurrent caller can observe a
    half-initialised module.
    """
    global _langfuse, _healthy, _initialised, _health_checked_at  # noqa: PLW0603

    if not _is_configured():
        logger.debug("LangFuse not configured – tracing disabled.")
        _langfuse = None
        _healthy = False
        _health_checked_at = time.monotonic()
        _initialised = True
        return

    try:
        from langfuse import get_client

        _langfuse = get_client()
        logger.info("LangFuse client initialised.")
    except Exception:
        logger.exception("LangFuse client init failed – tracing disabled.")
        _langfuse = None
        _healthy = False
        _health_checked_at = time.monotonic()
        _initialised = True
        return

    _healthy = _probe_health()
    _health_checked_at = time.monotonic()
    _initialised = True


def _refresh_health_if_stale() -> None:
    """Re-probe LangFuse when the cached health result has expired.

    Enables self-healing after a temporary outage.  Double-checked locking
    keeps the per-call fast path lock-free while guaranteeing a single
    probe per TTL window.
    """
    global _healthy, _health_checked_at  # noqa: PLW0603

    if _langfuse is None:
        return
    if (time.monotonic() - _health_checked_at) < _HEALTH_TTL_SECONDS:
        return

    with _lock:
        if (time.monotonic() - _health_checked_at) < _HEALTH_TTL_SECONDS:
            return
        _healthy = _probe_health()
        _health_checked_at = time.monotonic()


def get_langfuse_client() -> Langfuse | None:
    """Return the LangFuse singleton client, or ``None`` if not configured.

    The client is lazily created on first call and cached thereafter.
    If ``LANGFUSE_HOST``/``LANGFUSE_BASE_URL`` or ``LANGFUSE_PUBLIC_KEY``
    are missing, returns ``None`` so callers can skip tracing.

    **Health check:** After initialisation the client performs a quick
    connectivity probe.  If LangFuse is unreachable the client is still
    returned (tracing becomes best-effort), but :func:`is_langfuse_healthy`
    will return ``False`` so prompt resolution can fail fast.  The probe is
    re-run once its result is older than ``_HEALTH_TTL_SECONDS``.

    Returns:
        The LangFuse client instance, or ``None``.
    """
    if _initialised:
        _refresh_health_if_stale()
        return _langfuse

    with _lock:
        if not _initialised:
            _initialise_unlocked()

    return _langfuse

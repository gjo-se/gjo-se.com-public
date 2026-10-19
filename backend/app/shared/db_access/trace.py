"""Lightweight trace instrumentation for distributed pipeline debugging.

Writes ``pipeline.trace`` log events at ``DEBUG`` level so tracepoints are
silent in normal operation.  Enable via ``LOG_LEVEL=DEBUG`` or by setting
the structlog level for the ``pipeline.trace`` logger.

Usage in any file::

    from app.shared.db_access.trace import trace

    trace("03_enqueue", project_id=pid, restate_id=invocation_id)

Tracepoints are safe to leave in code permanently – they emit at DEBUG and
have zero overhead when disabled.
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger("pipeline.trace")


def trace(step: str, **ctx: object) -> None:
    """Emit a trace log event at DEBUG level.

    Args:
        step: Short step identifier, e.g. ``"03_enqueue"``.
        **ctx: Contextual key-value pairs (project_id, invocation_id, …).
    """
    logger.debug(step, **ctx)

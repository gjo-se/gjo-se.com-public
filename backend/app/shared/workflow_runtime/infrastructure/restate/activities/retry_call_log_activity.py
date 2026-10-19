"""Restate activity for retrying a single LLM call-log entry.

Wraps ``llm_call_log_service.retry_call_log`` with its own DB session.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service
from app.shared.llm_gateway.models.call_log import CallRetryStatus

logger = structlog.get_logger(__name__)

retry_call_log_service = Service("RetryCallLogActivity")


@retry_call_log_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Retry a single call-log entry.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``call_log_id`` (int) key.

    Returns:
        Dict with ``success`` (bool) and optional ``skipped`` (bool) if
        the entry was dead.
    """
    call_log_id: int = arg["call_log_id"]
    async with AsyncSessionLocal() as db:
        original = await get_llm_call_log_service().get_by_id(db, call_log_id)
        if original is not None and original.retry_status == CallRetryStatus.DEAD.value:
            logger.debug("RetryCallLogActivity: skipping dead entry call_log=%d", call_log_id)
            return {"success": True, "skipped": True, "call_log_id": call_log_id}
        if original is not None and original.error_type is None:
            logger.debug(
                "RetryCallLogActivity: skipping already-successful entry call_log=%d",
                call_log_id,
            )
            return {"success": True, "skipped": True, "call_log_id": call_log_id}

        try:
            await get_llm_call_log_service().retry_call_log(db, call_log_id)
            logger.info("RetryCallLogActivity: call_log=%d retried successfully", call_log_id)
            return {"success": True, "skipped": False, "call_log_id": call_log_id}
        except Exception:
            logger.exception("RetryCallLogActivity: call_log=%d failed", call_log_id)
            return {"success": False, "skipped": False, "call_log_id": call_log_id}

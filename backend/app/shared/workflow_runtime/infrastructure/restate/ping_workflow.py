"""Ping healthcheck workflow for Restate connectivity verification."""

import datetime

import structlog
from restate import Context, Workflow

logger = structlog.get_logger(__name__)

ping_workflow = Workflow("PingWorkflow")


@ping_workflow.handler()
async def run(ctx: Context) -> dict[str, str]:
    """Return a ``"pong"`` message with the current UTC timestamp.

    Used to verify end-to-end connectivity between the backend and the
    Restate runtime.
    """
    logger.info("PingWorkflow invoked")
    return {
        "message": "pong",
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
    }

"""Observer loop — runs the LLM observer as a background task.

Extracted from ``worker.py:433-456`` to decouple the observer from the
arq worker process. Runs in the FastAPI lifespan.
"""

from __future__ import annotations

import asyncio

import structlog

from app.shared.llm_gateway.repositories import observer_repository

logger = structlog.get_logger(__name__)


async def run_observer_loop() -> None:
    """Run the observer every 60 seconds in a background asyncio loop.

    Waits 60 s on startup to let other services settle, then executes
    ``Observer.run()`` indefinitely. Exceptions are logged but never
    crash the loop.
    """
    await asyncio.sleep(60)  # initial delay – let other services settle

    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_observer

    while True:
        try:
            async with observer_repository.open_session() as db:
                observer = get_observer(db)
                tickets = await observer.run()
                if tickets:
                    logger.info(
                        "Observer: created %d tickets – %s",
                        len(tickets),
                        [(t.task, t.ticket_type, t.severity) for t in tickets],
                    )
        except Exception:
            logger.exception("Observer loop iteration failed – will retry in 60s")
        await asyncio.sleep(60)

"""Scheduled job: run evaluation on all active tasks for drift detection."""

from __future__ import annotations

import structlog

logger = structlog.get_logger("nightly_eval")


async def run_nightly_eval() -> None:
    """Run the evaluation gates on every active production task config."""
    from sqlalchemy import select

    from app.shared.db_access.session import AsyncSessionLocal as CoreAsyncSessionLocal
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_evaluation_service
    from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
    from app.shared.llm_gateway.models.task_model_config import TaskModelConfig

    async with CoreAsyncSessionLocal() as db:
        completed = 0
        total = 0
        for task_key in TASK_REGISTRY:
            # Only evaluate tasks that have an active production config.
            config = await db.scalar(
                select(TaskModelConfig).where(
                    TaskModelConfig.task == task_key,
                    TaskModelConfig.is_production == True,  # noqa: E712
                )
            )
            if config is None:
                continue
            total += 1
            try:
                await get_evaluation_service().run_gates(db, task_key, "scheduled")
                completed += 1
            except Exception:
                logger.exception(
                    "nightly_eval: failed for task '%s'",
                    task_key,
                )

        logger.info(
            "nightly_eval: completed %d/%d tasks",
            completed,
            total,
        )

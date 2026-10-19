"""SQLAlchemy event listeners – auto-trigger evaluation on relevant changes.

Registers an ``after_update`` hook on :class:`TaskModelConfig` that
enqueues an evaluation run via arq when the model or hyperparameters change.
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger(__name__)

_registered = False


async def _enqueue_if_model_or_config_changed(target: object) -> None:
    """Check if ``model_id`` or ``hyperparameters`` changed and enqueue eval."""
    from app.shared.workflow_runtime.infrastructure.restate.dispatch import enqueue_eval_task

    try:
        from sqlalchemy import inspect

        mapper_utils = inspect(target)
        if mapper_utils is None:
            return
        model_changed = mapper_utils.attrs.model_id.history.has_changes()
        config_changed = mapper_utils.attrs.hyperparameters.history.has_changes()
        if not model_changed and not config_changed:
            return
    except Exception:
        logger.exception("event_listeners: could not inspect change history")
        return

    task_key = getattr(target, "task", None)
    if task_key is None:
        return

    trigger = "model_change" if model_changed else "config_change"
    await enqueue_eval_task(task_key, trigger)


def register_eval_triggers() -> None:
    """Register SQLAlchemy event listeners for auto-triggering evaluation.

    Idempotent – safe to call multiple times (e.g. on hot-reload).
    """
    global _registered  # noqa: PLW0603
    if _registered:
        return
    _registered = True

    from sqlalchemy import event

    from app.shared.llm_gateway.models.task_model_config import TaskModelConfig

    @event.listens_for(TaskModelConfig, "after_update")
    async def _on_model_config_update(
        _mapper: object,
        _connection: object,
        target: TaskModelConfig,
    ) -> None:
        """Enqueue an evaluation when a model config row changes.

        Args:
            _mapper: SQLAlchemy mapper (unused).
            _connection: Active connection (unused).
            target: The updated ``TaskModelConfig`` instance.
        """
        await _enqueue_if_model_or_config_changed(target)

    logger.info("event_listeners: registered eval auto-triggers")

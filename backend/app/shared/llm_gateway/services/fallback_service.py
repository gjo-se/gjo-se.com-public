"""Fallback service – resolves alternative model when primary fails.

When a task's primary model fails after retry exhaustion,
:class:`FallbackService` checks whether a fallback model is configured in the
task-model-config table and returns the fallback mapping for re-execution. The
DB access lives in :mod:`...repositories.task_model_config_repository`.
"""

from __future__ import annotations

from typing import Any

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.repositories import task_model_config_repository

logger = structlog.get_logger(__name__)


class FallbackService:
    """Resolves fallback model/credential for a failed LLM task.

    Usage::

        from app.shared.llm_gateway.services.fallback_service import fallback_service

        fallback_mapping = await fallback_service.resolve_fallback(db, "description-merge")
        if fallback_mapping is not None:
            # re-execute with fallback model
    """

    async def resolve_fallback(
        self,
        db: AsyncSession,
        task_key: str,
    ) -> dict[str, Any] | None:
        """Return fallback model/credential info, or ``None`` if not configured.

        Args:
            db: Active async database session (core DB).
            task_key: Task identifier from ``TASK_REGISTRY``.

        Returns:
            A dict with ``model_id`` and optional ``credential_id``,
            or ``None`` if no fallback is configured for this task.
        """
        fallback = await task_model_config_repository.get_fallback(db, task_key)
        if fallback is None:
            logger.debug(
                "fallback_service: no active fallback for task '%s'",
                task_key,
            )
            return None

        logger.info(
            "fallback_service: fallback resolved for task '%s' – fallback_model_id=%s, fallback_credential_id=%s",
            task_key,
            fallback.model_id,
            fallback.credential_id,
        )

        return {
            "model_id": fallback.model_id,
            "credential_id": fallback.credential_id,
        }

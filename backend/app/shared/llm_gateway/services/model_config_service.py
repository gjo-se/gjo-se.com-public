"""Unified CRUD service for LLM task model configurations.

Operates on ``TaskModelConfig`` for production, fallback, and evaluation model
configurations. The DB access lives in
:mod:`...repositories.task_model_config_repository` / ``judge_model_repository``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import structlog

from app.shared.config.config import settings
from app.shared.db_access.db_consumer import DatabaseConsumer
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.repositories import judge_model_repository, task_model_config_repository

if TYPE_CHECKING:
    from app.shared.llm_gateway.schemas.model_config_schemas import (
        ModelConfigCreate,
        ModelConfigUpdate,
    )

logger = structlog.get_logger(__name__)


class ModelConfigService(DatabaseConsumer):
    """Unified CRUD service for task-model-config rows.

    All queries go against the single ``llm_task_model_config`` table.
    ``is_production`` / ``is_fallback`` / ``is_eval`` flags control
    the role without requiring separate tables.
    """

    async def _check_not_judge_model(self, model_id: int, operation: str) -> None:
        """Raise ValueError if *model_id* is the LangFuse-configured Judge model.

        Judge models are reserved exclusively for LLM-as-Judge evaluation.
        They must not be used as production, fallback, or eval candidates.
        """
        if await judge_model_repository.is_judge_model(self._db, model_id, settings.LANGFUSE_PROJECT_ID):
            raise ValueError(
                f"Model ist als Judge in LangFuse konfiguriert und kann nicht "
                f"für {operation} verwendet werden. Ändere den Judge in den "
                f"LangFuse Settings → LLM Connections.",
            )

    # ── CRUD ──────────────────────────────────────────────────────────────

    async def create(
        self,
        task: str,
        data: ModelConfigCreate,
    ) -> TaskModelConfigRecord:
        """Persist a new model config, validating *task* against ``TASK_REGISTRY``.

        Args:
            task: Task key from ``TASK_REGISTRY``.
            data: Validated creation payload.

        Returns:
            The newly created model-config record.

        Raises:
            ValueError: The *task* is unknown, or constraints are violated.
        """
        if task not in TASK_REGISTRY:
            raise ValueError(
                f"Unbekannter Task: '{task}'. Gültige Tasks: {', '.join(sorted(TASK_REGISTRY.keys()))}",
            )

        # Block: Judge model must not be used for eval or production.
        if data.is_eval or data.is_production:
            await self._check_not_judge_model(
                data.model_id,
                "Production" if data.is_production else "Evaluation",
            )

        config = await task_model_config_repository.create(self._db, task, data)
        logger.info(
            "model_config_service: created id=%d for task='%s' model_id=%d prod=%s fallback=%s eval=%s",
            config.id,
            task,
            data.model_id,
            data.is_production,
            data.is_fallback,
            data.is_eval,
        )
        return config

    async def list_by_task(self, task: str) -> list[TaskModelConfigRecord]:
        """Return all model configs for a task, production first.

        Args:
            task: Task key filter.

        Returns:
            List of model-config records, sorted by
            ``is_production DESC, created_at DESC``.
        """
        return await task_model_config_repository.list_by_task(self._db, task)

    async def update(
        self,
        config_id: int,
        data: ModelConfigUpdate,
    ) -> TaskModelConfigRecord:
        """Partially update a model config.

        Only fields that are explicitly set (not ``None``) are changed.

        Args:
            config_id: Primary key of the config.
            data: Partial update payload.

        Returns:
            The updated model-config record.

        Raises:
            ValueError: No config found, or constraints violated.
        """
        existing = await task_model_config_repository.get_by_id(self._db, config_id)
        if existing is None:
            raise ValueError(f"Model-Config nicht gefunden: {config_id}")

        # Block: Judge model must not be used for eval or production.
        if data.is_eval or data.is_production:
            model_id = data.model_id if data.model_id is not None else existing.model_id
            await self._check_not_judge_model(
                model_id,
                "Production" if data.is_production else "Evaluation",
            )

        config = await task_model_config_repository.update(self._db, config_id, data)
        logger.info("model_config_service: updated id=%d", config_id)
        return config

    async def delete(self, config_id: int) -> None:
        """Delete a model config by id.

        Args:
            config_id: Primary key of the config.

        Raises:
            ValueError: No config found.
        """
        await task_model_config_repository.delete(self._db, config_id)
        logger.info("model_config_service: deleted id=%d", config_id)

    # ── Specialised queries ───────────────────────────────────────────────

    async def get_production(self, task: str) -> TaskModelConfigRecord | None:
        """Return the active production config for a task, or ``None``."""
        return await task_model_config_repository.get_production(self._db, task)

    async def get_fallback(self, task: str) -> TaskModelConfigRecord | None:
        """Return the active fallback config for a task, or ``None``."""
        return await task_model_config_repository.get_fallback(self._db, task)

    async def get_eval_configs(self, task: str) -> list[TaskModelConfigRecord]:
        """Return all active eval configs for a task."""
        return await task_model_config_repository.list_eval_configs(self._db, task)

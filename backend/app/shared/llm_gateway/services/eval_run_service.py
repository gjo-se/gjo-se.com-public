"""CRUD service for LLM evaluation run history.

Provides create and list operations for evaluation runs. Used by the admin API
to query run history. The DB access lives in
:mod:`...repositories.eval_run_repository`.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import structlog

from app.shared.db_access.db_consumer import DatabaseConsumer
from app.shared.llm_gateway.domain.eval_run_contract import EvalRunRecord
from app.shared.llm_gateway.repositories import eval_run_repository

if TYPE_CHECKING:
    from app.shared.llm_gateway.schemas.eval_run_schemas import EvalRunCreate

logger = structlog.get_logger(__name__)


class EvalRunService(DatabaseConsumer):
    """CRUD service for evaluation-run rows."""

    async def create(self, data: EvalRunCreate) -> EvalRunRecord:
        """Persist a new evaluation run.

        Args:
            data: Validated creation payload.

        Returns:
            The newly created evaluation run record.
        """
        run = await eval_run_repository.create(
            self._db,
            task=data.task,
            model_config_id=data.model_config_id,
            batch_id=data.batch_id,
            trigger=data.trigger,
            gate_results=data.gate_results,
            overall_status=data.overall_status,
            reviewer=data.reviewer,
        )
        logger.info(
            "eval_run_service: created run id=%d task='%s' status=%s",
            run.id,
            data.task,
            data.overall_status,
        )
        return run

    async def list_by_task(self, task: str, limit: int = 50) -> list[EvalRunRecord]:
        """Return evaluation runs for a task, newest first.

        Args:
            task: Task key filter.
            limit: Maximum number of runs to return (default 50).

        Returns:
            List of evaluation-run records, ordered by ``created_at`` desc.
        """
        return await eval_run_repository.list_by_task(self._db, task, limit)

"""Trigger Observer – live statistics from the LLM call log.

Aggregates ``llm_call_log`` data so the admin detail view can display
per-task trigger counts, first/last seen timestamps, and input/output
examples without duplicating information in ``TaskDefinition``. All DB access
lives in :mod:`...repositories.trigger_observer_repository`.
"""

from __future__ import annotations

import importlib
from typing import Any

import structlog
from pydantic import BaseModel

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.repositories import trigger_observer_repository
from app.shared.llm_gateway.schemas.task_schemas import (
    TaskExamplesResponse,
    TriggerObservationOut,
    TriggerStatsResponse,
)

logger = structlog.get_logger(__name__)


class TriggerObserverService:
    """Query engine on ``llm_call_log`` – no separate persistence table."""

    async def get_trigger_stats(
        self,
        db: AsyncSession,
        task_key: str,
    ) -> TriggerStatsResponse:
        """Aggregate trigger statistics for *task_key* from the call log.

        Returns allowed triggers from the registry, observed triggers with
        count + first/last seen, and unused triggers (allowed but never
        observed).
        """
        definition = TASK_REGISTRY.get(task_key)
        if definition is None:
            return TriggerStatsResponse(
                task_key=task_key,
                allowed=[],
                observed=[],
                unused=[],
            )

        allowed = [t.value for t in definition.allowed_triggers]

        records = await trigger_observer_repository.trigger_observations(db, task_key)

        observed = [
            TriggerObservationOut(
                trigger=record.trigger,
                count=record.count,
                first_seen=record.first_seen,
                last_seen=record.last_seen,
            )
            for record in records
        ]

        observed_triggers = {o.trigger for o in observed}
        unused = [t for t in allowed if t not in observed_triggers]

        return TriggerStatsResponse(
            task_key=task_key,
            allowed=allowed,
            observed=observed,
            unused=unused,
        )

    async def get_latest_examples(
        self,
        db: AsyncSession,
        task_key: str,
    ) -> TaskExamplesResponse:
        """Return the most recent input/output examples for *task_key*.

        Input example comes from the newest call log (success or failure).
        Output schema is lazily imported for structured tasks; output example
        is the result of the newest successful call.
        """
        definition = TASK_REGISTRY.get(task_key)

        # ── Input example: newest call log (any outcome) ─────────────────
        input_example = await trigger_observer_repository.newest_input_snapshot(db, task_key)

        # ── Output schema (structured tasks only) ────────────────────────
        output_schema: dict[str, Any] | None = None
        if definition is not None and definition.output_mode == "structured" and definition.output_schema is not None:
            try:
                module_path, _, class_name = definition.output_schema.partition(":")
                module = importlib.import_module(f"app.{module_path}")
                cls: type[BaseModel] = getattr(module, class_name)
                output_schema = cls.model_json_schema()
            except Exception:
                logger.exception(
                    "Failed to resolve output_schema for task '%s'",
                    task_key,
                )

        # ── Output example: newest successful call ───────────────────────
        # input_snapshot holds the serialised result for success rows.
        output_example = await trigger_observer_repository.newest_success_snapshot(db, task_key)

        return TaskExamplesResponse(
            task_key=task_key,
            input_example=input_example,
            output_schema=output_schema,
            output_example=output_example,
        )

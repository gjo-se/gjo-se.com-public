"""Gate 1b – validate that structured output parses against the schema."""

from __future__ import annotations

from typing import Any

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.llm_consumer_contract import LLMClientFactoryConsumer
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.services.gates.base import _DUMMY_PLACEHOLDERS, GateResult
from app.shared.llm_gateway.services.task_executor_service import _resolve_output_schema

logger = structlog.get_logger(__name__)


class SchemaGate(LLMClientFactoryConsumer):
    """Gate 1b: validate that structured output parses against the schema."""

    async def _gate_schema(
        self,
        db: AsyncSession,
        task_key: str,
    ) -> GateResult:
        """Validate that structured output can be parsed against output_schema."""
        definition = TASK_REGISTRY[task_key]

        if definition.output_schema is None:
            return GateResult(
                gate="schema_validation",
                status="skipped",
                score=0,
                details={"reason": "No output schema defined"},
            )

        variables = {ph.key: _DUMMY_PLACEHOLDERS.get(ph.key, f"<{ph.key}>") for ph in definition.placeholders}

        client = self._llm_client_factory(task_key)
        schema_cls = _resolve_output_schema(definition.output_schema)

        try:
            result = await client.call(
                db=db,
                task=task_key,
                variables=variables,
                output_schema=schema_cls,
            )
            return GateResult(
                gate="schema_validation",
                status="passed",
                score=1.0,
                details={
                    "schema_name": definition.output_schema,
                    "parse_success": True,
                    "output_type": type(result).__name__,
                },
            )
        except Exception as exc:
            logger.exception("evaluation_service: schema validation gate crashed")
            error_type = type(exc).__name__
            details: dict[str, Any] = {
                "schema_name": definition.output_schema,
                "parse_success": False,
                "error_type": error_type,
                "error_message": str(exc)[:500],
            }
            if "ValidationError" in error_type or "validation" in str(exc).lower():
                return GateResult(gate="schema_validation", status="failed", score=0, details=details)
            return GateResult(gate="schema_validation", status="blocked", score=0, details=details)

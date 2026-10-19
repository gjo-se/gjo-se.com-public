"""Generic task executor – SSOT for every LLM call.

The :class:`TaskExecutorService` is the single point through which every LLM
invocation flows, regardless of trigger (pipeline, button, backfill, admin
debug). It encapsulates:

* Registry validation
* Mapping → Model → Credential → Prompt resolution
* Output-mode dispatch (structured vs text)
* Call logging (success + failure)
* Input-snapshot preparation (for future retry)
* Circuit breaker protection (INC 4)

New tasks only need a :class:`TaskDefinition` entry, a prompt template, and
a mapping row – no worker code or custom dispatch needed. All DB access lives
in :mod:`...repositories.task_executor_repository`.
"""

from __future__ import annotations

import importlib
from collections.abc import Callable
from typing import Any

import structlog
from pydantic import BaseModel

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.client.client import LLMClient, classify_exception
from app.shared.llm_gateway.domain.llm_consumer_contract import LLMClientFactoryConsumer
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY, SkillExtractionTrigger, TaskDefinition
from app.shared.llm_gateway.exceptions import CIRCUIT_OPEN_ERROR_TYPE
from app.shared.llm_gateway.repositories import task_executor_repository

logger = structlog.get_logger(__name__)

_MAX_AUTO_RETRY_ATTEMPTS = 3
"""Maximum number of auto-retry attempts before marking a call log as dead."""


def _resolve_output_schema(schema_ref: str) -> type[BaseModel]:
    """Import and return the Pydantic model class referenced by *schema_ref*.

    *schema_ref* uses the format ``"module.path:ClassName"`` where the module
    path is relative to ``app.`` (e.g. ``"fbf.services.skill_extraction_service:SkillExtractionResult"``).

    Args:
        schema_ref: Fully-qualified reference string.

    Returns:
        The resolved Pydantic model class.

    Raises:
        ImportError: The module or class could not be found.
    """
    module_path, _, class_name = schema_ref.partition(":")
    module = importlib.import_module(f"app.{module_path}")
    cls = getattr(module, class_name, None)
    if cls is None or not issubclass(cls, BaseModel):
        raise ImportError(f"output_schema '{schema_ref}' does not resolve to a Pydantic BaseModel subclass")
    return cls


class TaskExecutorService(LLMClientFactoryConsumer):
    """Single source of truth for executing LLM tasks.

    Every LLM call goes through :meth:`execute_task`. The service resolves the
    task definition from the registry, dispatches to the correct LLMClient
    method based on ``output_mode``, and returns a uniform result dict.

    Usage::

        from app.shared.llm_gateway.services.task_executor_service import task_executor_service
        from app.shared.llm_gateway.domain.task_registry_rules import DescriptionMergeTrigger

        result = await task_executor_service.execute_task(
            db=core_db,
            task_key="description-merge",
            variables={"master_title": "...", ...},
            project_id=42,
            trigger=DescriptionMergeTrigger.PIPELINE,
        )
    """

    async def execute_task(
        self,
        *,
        db: AsyncSession,
        task_key: str,
        variables: dict[str, str],
        project_id: int | None = None,
        trigger: str | None = None,  # Stays str | None – callers must pass StrEnum, which is a str subclass
        phase: str | None = None,
        auto_retry_attempt: int = 0,
        hyperparameters: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a registered LLM task and return a uniform result.

        Args:
            db: Active async database session (core DB).
            task_key: Task identifier from ``TASK_REGISTRY``.
            variables: Placeholder values for the prompt template.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).
            auto_retry_attempt: Zero-based auto-retry attempt counter
                (0 = original invocation, 1+ = auto-retry).  The guard at
                ``>= 3`` prevents infinite retry loops and passes the
                failed log to the DLQ (INC 4).
            hyperparameters: Optional sampling-parameter override
                (e.g. ``{"temperature": 0.0, "seed": 42}``) merged over the
                persisted model-config hyperparameters.

        Returns:
            A dict with keys:
            - ``success``: ``True`` if the call completed without error.
            - ``result``: The LLM response (``str`` for text, Pydantic model
              instance for structured).
            - ``call_log_id``: The persisted call-log row id, or ``None``.
            - ``error_type``: Standardised error type string, or ``None``.
        """
        from app.shared.llm_gateway.exceptions import CircuitBreakerOpenError

        definition = TASK_REGISTRY.get(task_key)
        if definition is None:
            return {
                "success": False,
                "result": None,
                "call_log_id": None,
                "error_type": "no_mapping",
            }

        # ── Circuit Breaker: resolve provider_key from task mapping ──────
        provider_key = await self._resolve_provider_key(db, task_key)

        from app.shared.db_access.trace import trace

        trace("10_circuit_check", task_key=task_key, provider_key=provider_key, project_id=project_id)

        if provider_key is not None:
            try:
                from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_circuit_breaker_service

                await get_circuit_breaker_service().before_call(db, provider_key)
            except CircuitBreakerOpenError:
                logger.warning(
                    "task_executor_service: circuit breaker OPEN for '%s' – task '%s' blocked",
                    provider_key,
                    task_key,
                )
                return {
                    "success": False,
                    "result": None,
                    "call_log_id": None,
                    "error_type": CIRCUIT_OPEN_ERROR_TYPE,
                }

        client = self._llm_client_factory(task_key)

        try:
            if definition.output_mode == "structured":
                if definition.output_schema is None:
                    return {
                        "success": False,
                        "result": None,
                        "call_log_id": None,
                        "error_type": "no_mapping",
                    }
                schema = _resolve_output_schema(definition.output_schema)
                result = await client.call(
                    db=db,
                    task=task_key,
                    variables=variables,
                    output_schema=schema,
                    project_id=project_id,
                    trigger=trigger,
                    phase=phase,
                    hyperparameters=hyperparameters,
                )
            else:
                result = await client.call_text(
                    db=db,
                    task=task_key,
                    variables=variables,
                    project_id=project_id,
                    trigger=trigger,
                    phase=phase,
                    hyperparameters=hyperparameters,
                )

            # ── Circuit Breaker: report success ──────────────────────────
            await self._report_cb_success(provider_key)

            from app.shared.db_access.trace import trace

            trace("14_task_success", task_key=task_key, call_log_id=client._call_log_id, project_id=project_id)
            return {
                "success": True,
                "result": result,
                "call_log_id": client._call_log_id,
                "error_type": None,
            }
        except Exception as exc:
            error_type_enum = classify_exception(exc)
            error_type = error_type_enum.value
            from app.shared.db_access.trace import trace

            trace("14_task_failed", task_key=task_key, error_type=error_type, project_id=project_id)
            logger.exception(
                "task_executor_service: task '%s' failed (error_type=%s)",
                task_key,
                error_type,
            )

            # ── Circuit Breaker: report failure ─────────────────────────
            await self._report_cb_failure(exc, provider_key)

            # ── Auto-Retry: enqueue a delayed retry for transient errors ─────
            call_log_id = client._call_log_id
            await self._handle_auto_retry(
                db=db,
                task_key=task_key,
                variables=variables,
                project_id=project_id,
                auto_retry_attempt=auto_retry_attempt,
                call_log_id=call_log_id,
                error_type_enum=error_type_enum,
            )

            # ── Fallback: try alternative model after primary failure ───
            if auto_retry_attempt == 0:
                fallback_result_dict = await self._try_fallback(
                    db,
                    task_key=task_key,
                    definition=definition,
                    variables=variables,
                    project_id=project_id,
                    trigger=trigger,
                    hyperparameters=hyperparameters,
                    llm_client_factory=self._llm_client_factory,
                )
                if fallback_result_dict is not None:
                    return fallback_result_dict

            return {
                "success": False,
                "result": None,
                "call_log_id": call_log_id,
                "error_type": error_type,
            }

    @staticmethod
    async def _report_cb_success(provider_key: str | None) -> None:
        """Report a successful call to the circuit breaker (best-effort)."""
        if provider_key is None:
            return
        try:
            from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_circuit_breaker_service

            async with task_executor_repository.open_session() as cb_db:
                await get_circuit_breaker_service().on_success(cb_db, provider_key)
        except Exception:
            logger.exception("CB on_success failed for %s", provider_key)

    @staticmethod
    async def _report_cb_failure(exc: BaseException, provider_key: str | None) -> None:
        """Report a provider failure to the CB (skips non-provider errors like circuit-open/Langfuse)."""
        from app.shared.llm_gateway.exceptions import CircuitBreakerOpenError, LangfuseUnreachableError

        if provider_key is None or isinstance(exc, (CircuitBreakerOpenError, LangfuseUnreachableError)):
            return
        try:
            from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_circuit_breaker_service

            async with task_executor_repository.open_session() as cb_db:
                await get_circuit_breaker_service().on_failure(cb_db, provider_key)
        except Exception:
            logger.exception("CB on_failure failed for %s", provider_key)

    @staticmethod
    async def _handle_auto_retry(
        *,
        db: AsyncSession,
        task_key: str,
        variables: dict[str, str],
        project_id: int | None,
        auto_retry_attempt: int,
        call_log_id: int | None,
        error_type_enum: str,
    ) -> None:
        """Enqueue a delayed auto-retry for transient errors, or mark the log dead."""
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service
        from app.shared.llm_gateway.exceptions import AUTO_RETRYABLE_TYPES

        if call_log_id is None or error_type_enum not in {t.value for t in AUTO_RETRYABLE_TYPES}:
            return

        if auto_retry_attempt < _MAX_AUTO_RETRY_ATTEMPTS:
            defer_seconds = (2**auto_retry_attempt) * 10
            next_attempt = auto_retry_attempt + 1
            try:
                from app.shared.workflow_runtime.infrastructure.restate.client import set_retry_job_id
                from app.shared.workflow_runtime.infrastructure.restate.dispatch import enqueue_task

                job_id = await enqueue_task(
                    task_key=task_key,
                    variables=variables,
                    project_id=project_id or 0,
                    trigger=SkillExtractionTrigger.AUTO_RETRY,
                    defer_seconds=defer_seconds,
                    auto_retry_attempt=next_attempt,
                )
                await set_retry_job_id(call_log_id, job_id, auto_retry_attempt)
                logger.info(
                    "Auto-retry enqueued: task=%s call_log=%d attempt=%d defer=%ds job_id=%s",
                    task_key,
                    call_log_id,
                    next_attempt,
                    defer_seconds,
                    job_id,
                )
            except Exception:
                logger.exception(
                    "Failed to enqueue auto-retry for call_log=%d",
                    call_log_id,
                )
        else:
            logger.warning(
                "Auto-retry exhausted: task=%s call_log=%d attempt=%d – marking as dead",
                task_key,
                call_log_id,
                auto_retry_attempt,
            )
            try:
                await get_llm_call_log_service().mark_dead(db, call_log_id)
            except Exception:
                logger.exception(
                    "Failed to mark call_log=%d as dead",
                    call_log_id,
                )

    @staticmethod
    async def _try_fallback(
        db: AsyncSession,
        *,
        task_key: str,
        definition: TaskDefinition,
        variables: dict[str, str],
        project_id: int | None,
        trigger: str | None,
        hyperparameters: dict[str, Any] | None,
        llm_client_factory: Callable[[str], LLMClient],
    ) -> dict[str, Any] | None:
        """Try the configured fallback model after a primary failure; ``None`` if none/failed."""
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_fallback_service

        fallback_info = await get_fallback_service().resolve_fallback(db, task_key)
        if fallback_info is None:
            return None
        logger.info(
            "task_executor_service: fallback triggered for task '%s' – original_model_id=%s → fallback_model_id=%s",
            task_key,
            fallback_info["original_model_id"],
            fallback_info["fallback_model_id"],
        )
        fallback_client = llm_client_factory(task_key)
        try:
            if definition.output_mode == "structured":
                if definition.output_schema is not None:
                    schema = _resolve_output_schema(definition.output_schema)
                    fallback_result: Any = await fallback_client.call(
                        db=db,
                        task=task_key,
                        variables=variables,
                        output_schema=schema,
                        project_id=project_id,
                        trigger=trigger,
                        force_model_id=fallback_info["model_id"],
                        force_credential_id=fallback_info["credential_id"],
                        hyperparameters=hyperparameters,
                    )
                else:
                    fallback_result = None
            else:
                fallback_result = await fallback_client.call_text(
                    db=db,
                    task=task_key,
                    variables=variables,
                    project_id=project_id,
                    trigger=trigger,
                    force_model_id=fallback_info["model_id"],
                    force_credential_id=fallback_info["credential_id"],
                    hyperparameters=hyperparameters,
                )
            logger.info(
                "task_executor_service: fallback succeeded for task '%s'",
                task_key,
            )
            return {
                "success": True,
                "result": fallback_result,
                "call_log_id": fallback_client._call_log_id,
                "error_type": None,
            }
        except Exception:
            logger.exception(
                "task_executor_service: fallback also failed for task '%s'",
                task_key,
            )
            return None

    @staticmethod
    async def _resolve_provider_key(
        db: AsyncSession,
        task_key: str,
    ) -> str | None:
        """Resolve the provider key for circuit breaker from the task mapping.

        Returns ``None`` if no mapping/credential is configured, or if the db
        session does not support querying (e.g. in unit tests with mocks).
        """
        return await task_executor_repository.resolve_provider_key(db, task_key)

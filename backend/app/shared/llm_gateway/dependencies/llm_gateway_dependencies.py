"""Composition-root providers for the shared llm_gateway."""

from __future__ import annotations

from collections.abc import Callable
from functools import lru_cache

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.llm_gateway.client.dependencies import get_llm_client_factory
from app.shared.llm_gateway.services.audit_checker_service import AuditChecker
from app.shared.llm_gateway.services.baseline_service import DirectLlmInvoker
from app.shared.llm_gateway.services.call_log_promote_service import CallLogPromoteService
from app.shared.llm_gateway.services.call_log_service import CallLogService
from app.shared.llm_gateway.services.circuit_breaker_service import CircuitBreakerService
from app.shared.llm_gateway.services.eval_run_service import EvalRunService
from app.shared.llm_gateway.services.evaluation_service import EvaluationService
from app.shared.llm_gateway.services.fallback_service import FallbackService
from app.shared.llm_gateway.services.gates.ci_obs import ContractGate
from app.shared.llm_gateway.services.gates.direct_overhead_gate import DirectOverheadGate
from app.shared.llm_gateway.services.gates.eval_gates import RegressionGate
from app.shared.llm_gateway.services.gates.latency_gate import LatencyGate
from app.shared.llm_gateway.services.gates.schema_gate import SchemaGate
from app.shared.llm_gateway.services.langfuse_service import LangfuseService
from app.shared.llm_gateway.services.model_config_service import ModelConfigService
from app.shared.llm_gateway.services.model_service import LLMModelService
from app.shared.llm_gateway.services.model_sync_service import LLMModelSyncService
from app.shared.llm_gateway.services.observer_metrics_service import ObserverMetricsService
from app.shared.llm_gateway.services.observer_service import Observer
from app.shared.llm_gateway.services.observer_ticket_service import ObserverTicketService
from app.shared.llm_gateway.services.prompt_service import PromptService
from app.shared.llm_gateway.services.provider_service import LLMProviderService
from app.shared.llm_gateway.services.stability_analyzer_service import StabilityAnalyzer
from app.shared.llm_gateway.services.task_executor_service import TaskExecutorService
from app.shared.llm_gateway.services.trigger_observer_service import TriggerObserverService
from app.shared.llm_gateway.services.user_api_key_service import UserApiKeyService


def get_llm_call_log_service() -> CallLogService:
    """Provide an :class:`CallLogService`."""
    return CallLogService()


def get_model_config_service_factory() -> Callable[[AsyncSession], ModelConfigService]:
    """Provide a factory that binds a :class:`ModelConfigService` to a DB session."""
    return ModelConfigService


def get_direct_overhead_gate() -> DirectOverheadGate:
    """Provide a wired :class:`DirectOverheadGate`."""
    return DirectOverheadGate(get_llm_client_factory())


def get_latency_gate() -> LatencyGate:
    """Provide a wired :class:`LatencyGate`."""
    return LatencyGate(get_llm_client_factory())


def get_regression_gate() -> RegressionGate:
    """Provide a wired :class:`RegressionGate`."""
    return RegressionGate(get_llm_client_factory())


def get_schema_gate() -> SchemaGate:
    """Provide a wired :class:`SchemaGate`."""
    return SchemaGate(get_llm_client_factory())


def get_contract_gate() -> ContractGate:
    """Provide a :class:`ContractGate`."""
    return ContractGate()


def get_evaluation_service() -> EvaluationService:
    """Provide a wired :class:`EvaluationService`."""
    return EvaluationService(
        get_direct_overhead_gate(),
        get_latency_gate(),
        get_regression_gate(),
        get_model_config_service_factory(),
    )


def get_eval_run_service(db: AsyncSession = Depends(get_db)) -> EvalRunService:
    """Provide an :class:`EvalRunService` bound to the current DB session."""
    return EvalRunService(db)


def get_model_config_service(db: AsyncSession = Depends(get_db)) -> ModelConfigService:
    """Provide a :class:`ModelConfigService` bound to the current DB session."""
    return ModelConfigService(db)


def get_observer_ticket_service(db: AsyncSession = Depends(get_db)) -> ObserverTicketService:
    """Provide an :class:`ObserverTicketService` bound to the current DB session."""
    return ObserverTicketService(db)


def get_observer(db: AsyncSession = Depends(get_db)) -> Observer:
    """Provide a fully wired :class:`Observer` bound to the current DB session."""
    return Observer(db, ObserverTicketService(db))


def get_observer_metrics_service(db: AsyncSession = Depends(get_db)) -> ObserverMetricsService:
    """Provide an :class:`ObserverMetricsService` bound to the current DB session."""
    return ObserverMetricsService(db)


def get_audit_checker() -> AuditChecker:
    """Provide an :class:`AuditChecker`."""
    return AuditChecker()


def get_direct_client() -> DirectLlmInvoker:
    """Provide a :class:`DirectLlmInvoker`."""
    return DirectLlmInvoker()


def get_call_log_promote_service() -> CallLogPromoteService:
    """Provide a wired :class:`CallLogPromoteService`."""
    return CallLogPromoteService(get_embedding_client())


def get_circuit_breaker_service() -> CircuitBreakerService:
    """Provide a :class:`CircuitBreakerService`."""
    return CircuitBreakerService()


def get_fallback_service() -> FallbackService:
    """Provide a :class:`FallbackService`."""
    return FallbackService()


@lru_cache
def get_langfuse_service() -> LangfuseService:
    """Provide a cached :class:`LangfuseService` (owns a LangFuse SDK client)."""
    return LangfuseService()


def get_llm_model_service() -> LLMModelService:
    """Provide an :class:`LLMModelService`."""
    return LLMModelService()


def get_llm_model_sync_service() -> LLMModelSyncService:
    """Provide an :class:`LLMModelSyncService`."""
    return LLMModelSyncService()


def get_llm_provider_service() -> LLMProviderService:
    """Provide an :class:`LLMProviderService`."""
    return LLMProviderService()


def get_prompt_service() -> PromptService:
    """Provide a :class:`PromptService`."""
    return PromptService()


def get_stability_analyzer() -> StabilityAnalyzer:
    """Provide a :class:`StabilityAnalyzer`."""
    return StabilityAnalyzer()


def get_task_executor_service() -> TaskExecutorService:
    """Provide a wired :class:`TaskExecutorService`."""
    return TaskExecutorService(get_llm_client_factory())


def get_trigger_observer_service() -> TriggerObserverService:
    """Provide a :class:`TriggerObserverService`."""
    return TriggerObserverService()


def get_user_api_key_service() -> UserApiKeyService:
    """Provide a :class:`UserApiKeyService`."""
    return UserApiKeyService()

"""Integration tests for the llm_gateway composition-root providers."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.dependencies import llm_gateway_dependencies as deps
from app.shared.llm_gateway.services.call_log_service import CallLogService
from app.shared.llm_gateway.services.evaluation_service import EvaluationService
from app.shared.llm_gateway.services.prompt_service import PromptService
from app.shared.llm_gateway.services.task_executor_service import TaskExecutorService


@pytest.mark.integration
def test_provides_a_call_log_service() -> None:
    """The composition root yields a CallLogService."""
    assert isinstance(deps.get_llm_call_log_service(), CallLogService)


@pytest.mark.integration
def test_provides_a_wired_task_executor_service() -> None:
    """The composition root yields a factory-wired TaskExecutorService."""
    assert isinstance(deps.get_task_executor_service(), TaskExecutorService)


@pytest.mark.integration
def test_provides_a_wired_evaluation_service() -> None:
    """The composition root yields a fully wired EvaluationService."""
    assert isinstance(deps.get_evaluation_service(), EvaluationService)


@pytest.mark.integration
def test_provides_a_prompt_service() -> None:
    """The composition root yields a PromptService."""
    assert isinstance(deps.get_prompt_service(), PromptService)


@pytest.mark.integration
def test_langfuse_service_provider_is_cached() -> None:
    """The LangFuse service provider returns the same cached instance."""
    assert deps.get_langfuse_service() is deps.get_langfuse_service()

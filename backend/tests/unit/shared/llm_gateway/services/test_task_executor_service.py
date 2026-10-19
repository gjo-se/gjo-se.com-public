"""Unit tests for the generic task executor service.

Covers the observable result contract of ``TaskExecutorService.execute_task``:
- text-mode task returns the client's text result
- structured-mode task returns the client's Pydantic result
- unknown task key returns a ``no_mapping`` failure
- structured task without an ``output_schema`` returns a ``no_mapping`` failure

plus the lazy ``_resolve_output_schema`` lookup contract. The LLM client is
injected through the service factory as an in-memory boundary double, so no
module-level patch and no private-internal mock setup is needed.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import BaseModel

from app.fbf.services.skill_extraction_service import SkillExtractionResult
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY, TaskDefinition
from app.shared.llm_gateway.exceptions import AUTO_RETRYABLE_TYPES, CircuitBreakerOpenError
from app.shared.llm_gateway.models.call_log import CallErrorType
from app.shared.llm_gateway.services.task_executor_service import (
    TaskExecutorService,
    _resolve_output_schema,
)


class _FakeLLMClient:
    """Boundary double for ``LLMClient`` injected through the service factory.

    Returns a fixed text/structured result and exposes the ``call_log_id`` the
    service reads back from its collaborator. No internal state is inspected.
    """

    def __init__(
        self,
        *,
        text: str = "",
        structured: BaseModel | None = None,
        call_log_id: int | None = 42,
    ) -> None:
        self.canned_text = text
        self.canned_structured = structured
        self._call_log_id = call_log_id
        self.called_text = False
        self.called_structured = False

    async def call_text(self, **_kwargs: Any) -> str:
        """Return the canned text result."""
        self.called_text = True
        return self.canned_text

    async def call(self, **_kwargs: Any) -> BaseModel:
        """Return the canned structured result."""
        self.called_structured = True
        if self.canned_structured is None:
            raise AssertionError("fake LLM client has no structured result configured")
        return self.canned_structured


class _ScalarResult:
    """Minimal SQLAlchemy result double that yields no mapping row."""

    def scalar_one_or_none(self) -> None:
        """Return ``None`` – no provider mapping is configured."""
        return


class _NoMappingDb:
    """Async DB boundary double whose mapping query yields no production config."""

    async def execute(self, *_args: Any, **_kwargs: Any) -> _ScalarResult:
        """Return an empty scalar result for every query."""
        return _ScalarResult()


def _service_returning(client: _FakeLLMClient) -> TaskExecutorService:
    """Build a service whose injected factory always returns *client*."""
    return TaskExecutorService(lambda _task_key: client)


class TestExecuteTaskResultContract:
    """Observable result contract of ``TaskExecutorService.execute_task``."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_execute_text_task_returns_success(self) -> None:
        """A text-mode task returns success with the client's text result."""
        client = _FakeLLMClient(text="merged text result", call_log_id=42)

        result = await _service_returning(client).execute_task(
            db=_NoMappingDb(),
            task_key="description-merge",
            variables={"master_title": "Test", "master_description": "Desc"},
            project_id=1,
            trigger=None,
        )

        assert result["success"] is True
        assert result["result"] == "merged text result"
        assert result["call_log_id"] == 42
        assert result["error_type"] is None
        assert client.called_text is True

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_execute_structured_task_returns_success(self) -> None:
        """A structured task returns success with the client's Pydantic result."""
        expected = SkillExtractionResult()
        client = _FakeLLMClient(structured=expected, call_log_id=7)

        result = await _service_returning(client).execute_task(
            db=_NoMappingDb(),
            task_key="skill-extraction",
            variables={"merged_description": "text"},
            project_id=1,
            trigger=None,
        )

        assert result["success"] is True
        assert result["result"] is expected
        assert result["call_log_id"] == 7
        assert result["error_type"] is None
        assert client.called_structured is True

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_execute_unknown_task_returns_failure(self) -> None:
        """An unknown task key returns failure with a ``no_mapping`` error type."""
        client = _FakeLLMClient(text="unused")

        result = await _service_returning(client).execute_task(
            db=_NoMappingDb(),
            task_key="nonexistent-task",
            variables={},
            project_id=1,
            trigger=None,
        )

        assert result["success"] is False
        assert result["result"] is None
        assert result["error_type"] == "no_mapping"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_execute_structured_without_schema_returns_failure(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A structured task without an ``output_schema`` returns a ``no_mapping`` failure."""
        monkeypatch.setitem(
            TASK_REGISTRY,
            "structured-without-schema",
            TaskDefinition(
                key="structured-without-schema",
                display_name="Structured Without Schema",
                description="Test-only definition without an output schema.",
                allowed_triggers=(),
                placeholders=[],
                output_mode="structured",
                output_schema=None,
            ),
        )
        client = _FakeLLMClient(structured=SkillExtractionResult())

        result = await _service_returning(client).execute_task(
            db=_NoMappingDb(),
            task_key="structured-without-schema",
            variables={},
            project_id=1,
            trigger=None,
        )

        assert result["success"] is False
        assert result["result"] is None
        assert result["error_type"] == "no_mapping"


class TestResolveOutputSchema:
    """Contract of the lazy ``output_schema`` resolver."""

    @pytest.mark.unit
    def test_resolve_unknown_module_raises_import_error(self) -> None:
        """A non-existent module reference raises ImportError."""
        with pytest.raises(ImportError):
            _resolve_output_schema("nonexistent.module:SomeClass")

    @pytest.mark.unit
    def test_resolve_non_pydantic_class_raises_import_error(self) -> None:
        """A referenced class that is not a Pydantic model raises ImportError."""
        with pytest.raises(ImportError):
            _resolve_output_schema("shared.llm_gateway.domain.task_registry_rules:TaskDefinition")


class TestTaskRegistryOutputSchema:
    """Verify the output_schema field on TaskDefinition."""

    @pytest.mark.unit
    def test_skill_extraction_has_output_schema(self) -> None:
        """skill-extraction has an output_schema configured for structured output."""
        definition = TASK_REGISTRY["skill-extraction"]
        assert definition.output_schema is not None
        assert "SkillExtractionResult" in definition.output_schema

    @pytest.mark.unit
    def test_description_merge_has_no_output_schema(self) -> None:
        """description-merge (text mode) has no output_schema."""
        definition = TASK_REGISTRY["description-merge"]
        assert definition.output_schema is None


class _ScalarRow:
    """Result double returning a fixed mapping row."""

    def __init__(self, row: Any) -> None:
        self._row = row

    def scalar_one_or_none(self) -> Any:
        return self._row


class _ProviderDb:
    """DB double exposing the mapping query and credential lookup."""

    def __init__(self, mapping: Any, cred: Any) -> None:
        self._mapping = mapping
        self._cred = cred

    async def execute(self, *_args: Any, **_kwargs: Any) -> _ScalarRow:
        return _ScalarRow(self._mapping)

    async def get(self, _model: Any, _pk: Any) -> Any:
        return self._cred


class _TypeErrorDb:
    """DB double whose query does not support the ORM statement."""

    async def execute(self, *_args: Any, **_kwargs: Any) -> Any:
        raise TypeError("unsupported statement")


class _FallbackService:
    """Fallback-service double returning a fixed resolution."""

    def __init__(self, info: dict[str, Any] | None) -> None:
        self._info = info

    async def resolve_fallback(self, _db: Any, _task_key: str) -> dict[str, Any] | None:
        return self._info


class _CircuitBreakerService:
    """Circuit-breaker double recording success/failure reports."""

    def __init__(self) -> None:
        self.before_calls: list[str | None] = []
        self.successes: list[str] = []
        self.failures: list[str] = []

    async def before_call(self, _db: Any, provider_key: str | None) -> None:
        self.before_calls.append(provider_key)

    async def on_success(self, _db: Any, provider_key: str) -> None:
        self.successes.append(provider_key)

    async def on_failure(self, _db: Any, provider_key: str) -> None:
        self.failures.append(provider_key)


class _NullSession:
    """Async context-manager double standing in for a DB session."""

    async def __aenter__(self) -> _NullSession:
        return self

    async def __aexit__(self, *_exc: object) -> bool:
        return False


def _text_definition() -> TaskDefinition:
    return TaskDefinition(
        key="t",
        display_name="T",
        description="test",
        allowed_triggers=(),
        placeholders=[],
        output_mode="text",
        output_schema=None,
    )


class TestResolveProviderKey:
    """The provider key observed by the circuit breaker during ``execute_task``."""

    async def _provider_key_seen(self, monkeypatch: pytest.MonkeyPatch, db: Any) -> _CircuitBreakerService:
        """Run a successful task and return the circuit-breaker spy."""
        cb = _CircuitBreakerService()
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_circuit_breaker_service", lambda: cb
        )
        monkeypatch.setattr(
            "app.shared.llm_gateway.repositories.task_executor_repository.open_session",
            _NullSession,
        )

        result = await _service_returning(_FakeLLMClient(text="ok")).execute_task(
            db=db,
            task_key="description-merge",
            variables={"master_title": "T", "master_description": "D"},
            project_id=1,
            trigger=None,
        )

        assert result["success"] is True
        return cb

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_prefers_portal_over_service(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A credential with a portal key resolves to that portal key."""
        db = _ProviderDb(SimpleNamespace(credential_id=5), SimpleNamespace(portal="portal-key", service="svc"))

        cb = await self._provider_key_seen(monkeypatch, db)

        assert cb.successes == ["portal-key"]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_falls_back_to_service_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Without a portal key the service key is used."""
        db = _ProviderDb(SimpleNamespace(credential_id=5), SimpleNamespace(portal=None, service="svc"))

        cb = await self._provider_key_seen(monkeypatch, db)

        assert cb.successes == ["svc"]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_no_provider_key_without_mapping(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """No production mapping means no provider key is used."""
        db = _ProviderDb(None, SimpleNamespace(portal="p", service="s"))

        cb = await self._provider_key_seen(monkeypatch, db)

        assert cb.before_calls == []
        assert cb.successes == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_no_provider_key_without_credential_id(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A mapping without a credential id yields no provider key."""
        db = _ProviderDb(SimpleNamespace(credential_id=None), SimpleNamespace(portal="p", service="s"))

        cb = await self._provider_key_seen(monkeypatch, db)

        assert cb.successes == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_no_provider_key_when_credential_missing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A dangling credential id yields no provider key."""
        db = _ProviderDb(SimpleNamespace(credential_id=5), None)

        cb = await self._provider_key_seen(monkeypatch, db)

        assert cb.successes == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_no_provider_key_when_query_unsupported(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A DB that cannot execute the statement degrades to no provider key."""
        cb = await self._provider_key_seen(monkeypatch, _TypeErrorDb())

        assert cb.successes == []


class TestReportCircuitBreaker:
    """Best-effort circuit-breaker reporting contract."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_success_noop_without_provider_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Without a provider key no success report is attempted."""
        cb = _CircuitBreakerService()
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_circuit_breaker_service", lambda: cb
        )

        await TaskExecutorService._report_cb_success(None)

        assert cb.successes == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_success_reports_provider_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A success is reported for the resolved provider key."""
        cb = _CircuitBreakerService()
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_circuit_breaker_service", lambda: cb
        )
        monkeypatch.setattr(
            "app.shared.llm_gateway.repositories.task_executor_repository.open_session",
            _NullSession,
        )

        await TaskExecutorService._report_cb_success("provider-x")

        assert cb.successes == ["provider-x"]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_failure_reports_provider_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A provider error is reported as a failure."""
        cb = _CircuitBreakerService()
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_circuit_breaker_service", lambda: cb
        )
        monkeypatch.setattr(
            "app.shared.llm_gateway.repositories.task_executor_repository.open_session",
            _NullSession,
        )

        await TaskExecutorService._report_cb_failure(RuntimeError("boom"), "provider-y")

        assert cb.failures == ["provider-y"]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_failure_skips_circuit_open_error(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A circuit-open error is not reported again as a provider failure."""
        cb = _CircuitBreakerService()
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_circuit_breaker_service", lambda: cb
        )

        await TaskExecutorService._report_cb_failure(CircuitBreakerOpenError("open"), "provider-z")

        assert cb.failures == []


class TestHandleAutoRetry:
    """Auto-retry enqueue/exhaustion contract."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_enqueues_retry_with_exponential_backoff(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Attempt 1 enqueues attempt 2 with a 20s defer and records the job id."""
        enqueued: dict[str, Any] = {}
        recorded: dict[str, Any] = {}

        async def _enqueue(**kwargs: Any) -> str:
            enqueued.update(kwargs)
            return "job-123"

        async def _set_retry(call_log_id: int, job_id: str, attempt: int) -> None:
            recorded.update(call_log_id=call_log_id, job_id=job_id, attempt=attempt)

        monkeypatch.setattr("app.shared.workflow_runtime.infrastructure.restate.dispatch.enqueue_task", _enqueue)
        monkeypatch.setattr("app.shared.workflow_runtime.infrastructure.restate.client.set_retry_job_id", _set_retry)

        await TaskExecutorService._handle_auto_retry(
            db=None,
            task_key="t",
            variables={"a": "b"},
            project_id=5,
            auto_retry_attempt=1,
            call_log_id=99,
            error_type_enum=next(iter(AUTO_RETRYABLE_TYPES)),
        )

        assert enqueued["defer_seconds"] == 20
        assert enqueued["auto_retry_attempt"] == 2
        assert enqueued["project_id"] == 5
        assert recorded == {"call_log_id": 99, "job_id": "job-123", "attempt": 1}

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_marks_dead_after_max_attempts(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """At the max attempt the call log is marked dead instead of re-enqueued."""
        marked: list[int] = []

        class _CallLogService:
            async def mark_dead(self, _db: Any, call_log_id: int) -> None:
                marked.append(call_log_id)

        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_llm_call_log_service",
            _CallLogService,
        )

        await TaskExecutorService._handle_auto_retry(
            db=None,
            task_key="t",
            variables={},
            project_id=None,
            auto_retry_attempt=3,
            call_log_id=99,
            error_type_enum=next(iter(AUTO_RETRYABLE_TYPES)),
        )

        assert marked == [99]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_noop_without_call_log_id(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Without a call-log id nothing is enqueued or marked dead."""
        enqueued: list[Any] = []

        async def _enqueue(**kwargs: Any) -> str:
            enqueued.append(kwargs)
            return "job"

        monkeypatch.setattr("app.shared.workflow_runtime.infrastructure.restate.dispatch.enqueue_task", _enqueue)

        await TaskExecutorService._handle_auto_retry(
            db=None,
            task_key="t",
            variables={},
            project_id=None,
            auto_retry_attempt=0,
            call_log_id=None,
            error_type_enum=next(iter(AUTO_RETRYABLE_TYPES)),
        )

        assert enqueued == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_noop_for_non_retryable_error(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A non-retryable error type is not enqueued."""
        enqueued: list[Any] = []

        async def _enqueue(**kwargs: Any) -> str:
            enqueued.append(kwargs)
            return "job"

        monkeypatch.setattr("app.shared.workflow_runtime.infrastructure.restate.dispatch.enqueue_task", _enqueue)
        non_retryable = next(err for err in CallErrorType if err not in AUTO_RETRYABLE_TYPES)

        await TaskExecutorService._handle_auto_retry(
            db=None,
            task_key="t",
            variables={},
            project_id=None,
            auto_retry_attempt=0,
            call_log_id=99,
            error_type_enum=non_retryable,
        )

        assert enqueued == []


class TestTryFallback:
    """Fallback-model attempt contract."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_returns_none_without_configured_fallback(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """No configured fallback returns None without calling any client."""
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_fallback_service",
            lambda: _FallbackService(None),
        )

        result = await TaskExecutorService._try_fallback(
            None,
            task_key="t",
            definition=_text_definition(),
            variables={},
            project_id=None,
            trigger=None,
            hyperparameters=None,
            llm_client_factory=lambda _k: _FakeLLMClient(text="unused"),
        )

        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_text_fallback_returns_success(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A successful text fallback returns the client result and its log id."""
        info = {"original_model_id": 1, "fallback_model_id": 2, "model_id": 2, "credential_id": 5}
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_fallback_service",
            lambda: _FallbackService(info),
        )
        client = _FakeLLMClient(text="fallback text", call_log_id=77)

        result = await TaskExecutorService._try_fallback(
            None,
            task_key="t",
            definition=_text_definition(),
            variables={},
            project_id=None,
            trigger=None,
            hyperparameters=None,
            llm_client_factory=lambda _k: client,
        )

        assert result == {"success": True, "result": "fallback text", "call_log_id": 77, "error_type": None}

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_structured_fallback_without_schema_yields_none_result(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A structured fallback without an output schema succeeds with a None result."""
        info = {"original_model_id": 1, "fallback_model_id": 2, "model_id": 2, "credential_id": 5}
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_fallback_service",
            lambda: _FallbackService(info),
        )
        definition = TaskDefinition(
            key="t",
            display_name="T",
            description="test",
            allowed_triggers=(),
            placeholders=[],
            output_mode="structured",
            output_schema=None,
        )

        result = await TaskExecutorService._try_fallback(
            None,
            task_key="t",
            definition=definition,
            variables={},
            project_id=None,
            trigger=None,
            hyperparameters=None,
            llm_client_factory=lambda _k: _FakeLLMClient(call_log_id=88),
        )

        assert result is not None
        assert result["success"] is True
        assert result["result"] is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_fallback_failure_returns_none(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A failing fallback call returns None."""
        info = {"original_model_id": 1, "fallback_model_id": 2, "model_id": 2, "credential_id": 5}
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_fallback_service",
            lambda: _FallbackService(info),
        )

        class _FailingClient:
            _call_log_id = None

            async def call_text(self, **_kwargs: Any) -> str:
                raise RuntimeError("fallback down")

        result = await TaskExecutorService._try_fallback(
            None,
            task_key="t",
            definition=_text_definition(),
            variables={},
            project_id=None,
            trigger=None,
            hyperparameters=None,
            llm_client_factory=lambda _k: _FailingClient(),
        )

        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_execute_task_attempts_fallback_on_primary_failure(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The original attempt (counter 0) tries the fallback after a primary failure."""
        monkeypatch.setattr(
            "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_fallback_service",
            lambda: _FallbackService(
                {"original_model_id": 1, "fallback_model_id": 2, "model_id": 2, "credential_id": 5}
            ),
        )

        class _FailingClient:
            _call_log_id = 55

            async def call_text(self, **_kwargs: Any) -> str:
                raise RuntimeError("primary down")

        # First factory call = primary (fails), second = fallback (recovers).
        clients: list[Any] = [_FailingClient(), _FakeLLMClient(text="recovered", call_log_id=56)]

        result = await TaskExecutorService(lambda _task_key: clients.pop(0)).execute_task(
            db=_NoMappingDb(),
            task_key="description-merge",
            variables={},
            project_id=1,
            trigger=None,
        )

        assert result["success"] is True
        assert result["result"] == "recovered"
        assert result["call_log_id"] == 56

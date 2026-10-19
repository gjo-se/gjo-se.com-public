"""Unit tests for the LLM call lifecycle skeleton.

The DB-bound call-log service and the Langfuse client are replaced with
in-memory fakes, so the prepare → log → invoke → log orchestration (and its
streaming variant) is exercised without a database, network or Langfuse.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any, cast

import pytest
from langchain_core.messages import HumanMessage
from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler

from app.shared.llm_gateway.client import lifecycle as lifecycle_module
from app.shared.llm_gateway.client.lifecycle import LLMCallLifecycleMixin, _UsageSink
from app.shared.llm_gateway.client.prepared_call import _PreparedCall
from app.shared.llm_gateway.dependencies import llm_gateway_dependencies as dependencies_module
from app.shared.llm_gateway.models.call_log import CallErrorType, CallType

pytestmark = pytest.mark.unit


class _FakeDbSession:
    """Async session stand-in recording whether it was closed."""

    def __init__(self) -> None:
        self.closed = False

    async def close(self) -> None:
        self.closed = True


class _FakeLangfuse:
    """Langfuse client stand-in counting flush calls."""

    def __init__(self) -> None:
        self.flush_count = 0

    def flush(self) -> None:
        self.flush_count += 1


class _FakeCallLogService:
    """In-memory stand-in for the LLM call-log service (persistence boundary)."""

    def __init__(self) -> None:
        self.records: list[dict[str, Any]] = []
        self.completions: list[dict[str, Any]] = []

    async def record(self, **kwargs: Any) -> int:
        self.records.append(kwargs)
        return len(self.records)

    async def complete(self, call_log_id: int, **kwargs: Any) -> None:
        self.completions.append({"call_log_id": call_log_id, **kwargs})


def _prepared() -> _PreparedCall:
    """Build a prepared call for the lifecycle tests."""
    return _PreparedCall(
        messages=[HumanMessage(content="hi")],
        model_identifier="deepseek-v4-flash",
        api_key="abcdefghijklmnop",
        portal="direct",
        base_url=None,
        credential_service="direct:deepseek:1",
        prompt_version=3,
        has_reasoning=False,
        output_mode="text",
        model_kwargs={},
        input_snapshot={"variables": {"name": "x"}, "prompt_version": 3, "output_schema": None, "portal": "direct"},
    )


@pytest.fixture()
def call_log(monkeypatch: pytest.MonkeyPatch) -> _FakeCallLogService:
    """Provide an in-memory call-log service wired into the lifecycle module."""
    fake = _FakeCallLogService()
    monkeypatch.setattr(lifecycle_module, "get_langfuse_client", _FakeLangfuse)
    monkeypatch.setattr(lifecycle_module, "LangfuseCallbackHandler", object)
    monkeypatch.setattr(dependencies_module, "get_llm_call_log_service", lambda: fake)
    return fake


async def test_run_request_returns_result_and_logs_success(call_log: _FakeCallLogService) -> None:
    """A non-streaming call closes the session, logs pending then completes as success."""
    mixin = LLMCallLifecycleMixin()
    db = _FakeDbSession()
    prepared = _prepared()

    async def _prepare() -> _PreparedCall:
        return prepared

    async def _invoke(
        prepared_call: _PreparedCall,
        handler: LangfuseCallbackHandler,
        usage: _UsageSink,
    ) -> str:
        usage.value = {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12}
        return "result-text"

    result = await mixin._run_request(
        db=cast(Any, db),
        task="task-x",
        variables={"name": "x"},
        call_type=CallType.TEXT,
        prepare=_prepare,
        invoke=_invoke,
        to_output=lambda value: value,
        project_id=None,
        trigger=None,
        phase=None,
    )

    assert result == "result-text"
    assert db.closed is True
    pending = call_log.records[0]
    assert pending["success"] is None
    assert pending["resolved_model"] == "deepseek-v4-flash"
    assert pending["resolved_credential"] == "direct:deepseek:1"
    assert pending["input_snapshot"]["call_type"] == "text"
    completion = call_log.completions[0]
    assert completion["success"] is True
    assert completion["output_snapshot"] == "result-text"
    assert completion["prompt_tokens"] == 5
    assert completion["completion_tokens"] == 7
    assert completion["total_tokens"] == 12


async def test_run_request_logs_failure_and_reraises(call_log: _FakeCallLogService) -> None:
    """A raising invocation completes the log row as failure and re-raises."""
    mixin = LLMCallLifecycleMixin()
    db = _FakeDbSession()
    prepared = _prepared()

    async def _prepare() -> _PreparedCall:
        return prepared

    async def _invoke(
        prepared_call: _PreparedCall,
        handler: LangfuseCallbackHandler,
        usage: _UsageSink,
    ) -> str:
        raise RuntimeError("provider exploded")

    with pytest.raises(RuntimeError, match="provider exploded"):
        await mixin._run_request(
            db=cast(Any, db),
            task="task-x",
            variables={},
            call_type=CallType.TEXT,
            prepare=_prepare,
            invoke=_invoke,
            to_output=lambda value: value,
            project_id=None,
            trigger=None,
            phase=None,
        )

    completion = call_log.completions[0]
    assert completion["success"] is False
    assert completion["error_message"] == "provider exploded"
    assert completion["error_type"] == CallErrorType.UNKNOWN


async def test_run_stream_yields_chunks_and_logs_joined_output(call_log: _FakeCallLogService) -> None:
    """A streamed call yields chunks in order and logs their concatenation."""
    mixin = LLMCallLifecycleMixin()
    db = _FakeDbSession()
    prepared = _prepared()

    async def _prepare() -> _PreparedCall:
        return prepared

    async def _stream(
        prepared_call: _PreparedCall,
        handler: LangfuseCallbackHandler,
    ) -> AsyncIterator[str]:
        yield "Hello "
        yield "World"

    chunks = [
        chunk
        async for chunk in mixin._run_stream(
            db=cast(Any, db),
            task="task-x",
            variables={},
            call_type=CallType.STREAM,
            prepare=_prepare,
            stream=_stream,
            project_id=None,
            trigger=None,
            phase=None,
        )
    ]

    assert chunks == ["Hello ", "World"]
    assert call_log.completions[0]["output_snapshot"] == "Hello World"
    assert db.closed is False


async def test_run_stream_logs_failure_and_reraises(call_log: _FakeCallLogService) -> None:
    """A failing stream logs the failure and re-raises the error."""
    mixin = LLMCallLifecycleMixin()
    db = _FakeDbSession()
    prepared = _prepared()

    async def _prepare() -> _PreparedCall:
        return prepared

    async def _stream(
        prepared_call: _PreparedCall,
        handler: LangfuseCallbackHandler,
    ) -> AsyncIterator[str]:
        yield "partial"
        raise RuntimeError("stream broke")

    with pytest.raises(RuntimeError, match="stream broke"):
        _ = [
            chunk
            async for chunk in mixin._run_stream(
                db=cast(Any, db),
                task="task-x",
                variables={},
                call_type=CallType.STREAM,
                prepare=_prepare,
                stream=_stream,
                project_id=None,
                trigger=None,
                phase=None,
            )
        ]

    completion = call_log.completions[0]
    assert completion["success"] is False
    assert completion["error_message"] == "stream broke"


def test_usage_sink_starts_empty() -> None:
    """The usage sink starts without captured token usage."""
    assert _UsageSink().value is None

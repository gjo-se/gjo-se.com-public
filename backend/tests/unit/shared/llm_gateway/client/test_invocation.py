"""Unit tests for provider-specific invocation wiring.

Covers the shared LangChain invoke config (Langfuse callbacks + metadata) and
the structured-output runnable construction, including the DeepSeek quirks.
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from langchain_core.messages import HumanMessage
from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler

from app.shared.llm_gateway.client import invocation as invocation_module
from app.shared.llm_gateway.client.invocation import build_invoke_config, build_structured_llm
from app.shared.llm_gateway.client.prepared_call import _PreparedCall

pytestmark = pytest.mark.unit


class _DummySchema:
    """Placeholder output schema used to assert the structured-output wiring."""


class _FakeStructuredRunnable:
    """Structured-output runnable capturing the arguments it was built with."""

    def __init__(self) -> None:
        self.runnable = object()
        self.schema: Any = None
        self.include_raw: bool | None = None
        self.extra_kwargs: dict[str, Any] = {}

    def with_structured_output(self, schema: Any, *, include_raw: bool, **kwargs: Any) -> object:
        self.schema = schema
        self.include_raw = include_raw
        self.extra_kwargs = kwargs
        return self.runnable


class _FakeProviderFactory:
    """Stand-in for ``get_llm_client`` capturing the provider arguments."""

    def __init__(self) -> None:
        self.captured: dict[str, Any] = {}
        self.llm = _FakeStructuredRunnable()

    def __call__(
        self,
        model: str,
        api_key: str | None = None,
        *,
        portal: str | None = None,
        base_url: str | None = None,
        extra_body: dict[str, object] | None = None,
        model_kwargs: dict[str, object] | None = None,
    ) -> _FakeStructuredRunnable:
        self.captured = {
            "model": model,
            "portal": portal,
            "base_url": base_url,
            "extra_body": extra_body,
            "model_kwargs": model_kwargs,
        }
        return self.llm


def _prepared(
    *,
    output_mode: str = "text",
    has_reasoning: bool = False,
    model_identifier: str = "gpt-4o",
    model_kwargs: dict[str, object] | None = None,
) -> _PreparedCall:
    """Build a prepared call for the invocation-wiring tests."""
    return _PreparedCall(
        messages=[HumanMessage(content="hi")],
        model_identifier=model_identifier,
        api_key="abcdefghijklmnop",
        portal="direct",
        base_url=None,
        credential_service="direct:openai:1",
        prompt_version=1,
        has_reasoning=has_reasoning,
        output_mode=output_mode,
        model_kwargs=model_kwargs or {},
        input_snapshot={},
    )


def test_invoke_config_registers_handler_as_callback() -> None:
    """The Langfuse handler is attached as the sole LangChain callback."""
    handler = cast(LangfuseCallbackHandler, object())

    config = build_invoke_config(handler, None, None, "task-x", "model-y", None)

    assert config["callbacks"] == [handler]


def test_invoke_config_tags_project_id_when_present() -> None:
    """A project id becomes a Langfuse tag so traces are attributable."""
    handler = cast(LangfuseCallbackHandler, object())

    config = build_invoke_config(handler, 42, None, "task-x", "model-y", None)

    assert config["metadata"]["langfuse_tags"] == ["42"]


def test_invoke_config_omits_tags_when_project_id_absent() -> None:
    """Without a project id no Langfuse tag is emitted."""
    handler = cast(LangfuseCallbackHandler, object())

    config = build_invoke_config(handler, None, None, "task-x", "model-y", None)

    assert config["metadata"]["langfuse_tags"] == []


def test_invoke_config_records_trigger_task_model_and_portal() -> None:
    """The Langfuse metadata carries trigger, task, model and portal verbatim."""
    handler = cast(LangfuseCallbackHandler, object())

    config = build_invoke_config(handler, None, "button", "task-x", "model-y", "openrouter")

    assert config["metadata"]["langfuse_metadata"] == {
        "trigger": "button",
        "task": "task-x",
        "model": "model-y",
        "portal": "openrouter",
    }


def test_invoke_config_defaults_missing_trigger_and_portal_to_empty_string() -> None:
    """Missing trigger/portal are recorded as empty strings, never ``None``."""
    handler = cast(LangfuseCallbackHandler, object())

    config = build_invoke_config(handler, None, None, "task-x", "model-y", None)

    metadata = config["metadata"]["langfuse_metadata"]
    assert metadata["trigger"] == ""
    assert metadata["portal"] == ""


def test_structured_llm_returns_runnable_and_requests_raw_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The structured runnable is returned and built with ``include_raw=True``."""
    factory = _FakeProviderFactory()
    monkeypatch.setattr(invocation_module, "get_llm_client", factory)

    runnable = build_structured_llm(_prepared(), _DummySchema)

    assert runnable is factory.llm.runnable
    assert factory.llm.schema is _DummySchema
    assert factory.llm.include_raw is True


def test_structured_llm_disables_thinking_for_reasoning_structured_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A reasoning model in structured mode disables DeepSeek thinking mode."""
    factory = _FakeProviderFactory()
    monkeypatch.setattr(invocation_module, "get_llm_client", factory)

    build_structured_llm(_prepared(output_mode="structured", has_reasoning=True), _DummySchema)

    assert factory.captured["extra_body"] == {"thinking": {"type": "disabled"}}


def test_structured_llm_keeps_thinking_enabled_for_text_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    """A reasoning model in text mode keeps thinking mode untouched."""
    factory = _FakeProviderFactory()
    monkeypatch.setattr(invocation_module, "get_llm_client", factory)

    build_structured_llm(_prepared(output_mode="text", has_reasoning=True), _DummySchema)

    assert factory.captured["extra_body"] is None


def test_structured_llm_uses_function_calling_for_deepseek_models(monkeypatch: pytest.MonkeyPatch) -> None:
    """DeepSeek's native API uses ``function_calling`` (no json_schema support)."""
    factory = _FakeProviderFactory()
    monkeypatch.setattr(invocation_module, "get_llm_client", factory)

    build_structured_llm(_prepared(model_identifier="deepseek-v4-flash"), _DummySchema)

    assert factory.llm.extra_kwargs == {"method": "function_calling"}


def test_structured_llm_omits_method_for_non_deepseek_models(monkeypatch: pytest.MonkeyPatch) -> None:
    """Non-DeepSeek models rely on the default structured-output method."""
    factory = _FakeProviderFactory()
    monkeypatch.setattr(invocation_module, "get_llm_client", factory)

    build_structured_llm(_prepared(model_identifier="gpt-4o"), _DummySchema)

    assert factory.llm.extra_kwargs == {}


def test_structured_llm_forwards_sampling_kwargs_to_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    """The resolved sampling parameters are forwarded to the provider factory."""
    factory = _FakeProviderFactory()
    monkeypatch.setattr(invocation_module, "get_llm_client", factory)

    build_structured_llm(_prepared(model_kwargs={"temperature": 0.2}), _DummySchema)

    assert factory.captured["model_kwargs"] == {"temperature": 0.2}

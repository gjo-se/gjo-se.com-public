"""Unit tests for the direct HTTP LLM invoker (httpx mocked at the boundary)."""

from __future__ import annotations

from typing import Any

import pytest

from app.shared.llm_gateway.services import baseline_service as baseline_module
from app.shared.llm_gateway.services.baseline_service import DirectLlmInvoker


class _FakeResponse:
    """Minimal httpx response double."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        """No-op – the fake is always successful."""

    def json(self) -> dict[str, Any]:
        """Return the canned payload."""
        return self._payload


class _FakeAsyncClient:
    """Async-context-manager stand-in for httpx.AsyncClient recording the URL."""

    def __init__(self, response: _FakeResponse) -> None:
        self._response = response
        self.last_url: str | None = None

    async def __aenter__(self) -> _FakeAsyncClient:
        return self

    async def __aexit__(self, *_exc: object) -> bool:
        return False

    async def post(self, url: str, json: dict[str, Any], headers: dict[str, str]) -> _FakeResponse:
        """Record the request URL and return the canned response."""
        self.last_url = url
        return self._response


def _install(monkeypatch: pytest.MonkeyPatch, payload: dict[str, Any]) -> _FakeAsyncClient:
    """Patch httpx.AsyncClient inside the module with a fake and return it."""
    fake = _FakeAsyncClient(_FakeResponse(payload))
    monkeypatch.setattr(baseline_module.httpx, "AsyncClient", lambda **_kwargs: fake)
    return fake


@pytest.mark.unit
async def test_openrouter_portal_targets_the_openrouter_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """The openrouter portal resolves to the OpenRouter chat-completions URL."""
    fake = _install(
        monkeypatch,
        {"choices": [{"message": {"content": "hello"}}], "usage": {"total_tokens": 7}},
    )

    result = await DirectLlmInvoker().call(
        messages=[{"role": "user", "content": "hi"}],
        model_identifier="deepseek/deepseek-v3",
        api_key="test-key",  # pragma: allowlist secret
        portal="openrouter",
    )

    assert result.response_text == "hello"
    assert result.token_count == 7
    assert fake.last_url == "https://openrouter.ai/api/v1/chat/completions"


@pytest.mark.unit
async def test_direct_portal_uses_the_provided_api_base(monkeypatch: pytest.MonkeyPatch) -> None:
    """A direct provider call targets the configured api_base."""
    fake = _install(monkeypatch, {"choices": [{"message": {"content": "ok"}}]})

    await DirectLlmInvoker().call(
        messages=[{"role": "user", "content": "hi"}],
        model_identifier="deepseek-chat",
        api_key="test-key",  # pragma: allowlist secret
        portal=None,
        api_base="https://api.deepseek.com",
    )

    assert fake.last_url == "https://api.deepseek.com/chat/completions"


@pytest.mark.unit
async def test_direct_without_api_base_falls_back_to_openrouter(monkeypatch: pytest.MonkeyPatch) -> None:
    """A direct call without api_base degrades to the OpenRouter endpoint."""
    fake = _install(monkeypatch, {"choices": []})

    result = await DirectLlmInvoker().call(
        messages=[{"role": "user", "content": "hi"}],
        model_identifier="some-model",
        api_key="test-key",  # pragma: allowlist secret
        portal=None,
        api_base=None,
    )

    assert result.response_text == ""
    assert result.token_count is None
    assert fake.last_url == "https://openrouter.ai/api/v1/chat/completions"

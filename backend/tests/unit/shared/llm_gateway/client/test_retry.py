"""Unit tests for the tenacity retry decorator for transient LLM errors."""

from __future__ import annotations

import httpx
import pytest
from openai import APITimeoutError
from tenacity import RetryError, wait_none

from app.shared.llm_gateway.client import retry as retry_module
from app.shared.llm_gateway.client.retry import with_llm_retry


def _timeout_error() -> APITimeoutError:
    """Return an OpenAI timeout error (a retryable provider failure)."""
    return APITimeoutError(request=httpx.Request("POST", "https://api.example.com/v1"))


@pytest.mark.unit
async def test_decorated_call_returns_value_without_retrying_on_success() -> None:
    """A successful call runs exactly once and returns its value."""
    attempts: list[int] = []

    @with_llm_retry
    async def call() -> str:
        attempts.append(1)
        return "ok"

    result = await call()

    assert result == "ok"
    assert attempts == [1]


@pytest.mark.unit
async def test_decorated_call_retries_retryable_error_then_raises_retry_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A transient provider error is retried to exhaustion (3 attempts) then raises."""
    monkeypatch.setattr(retry_module, "wait_exponential", lambda **_: wait_none())
    attempts: list[int] = []

    @with_llm_retry
    async def call() -> str:
        attempts.append(1)
        raise _timeout_error()

    with pytest.raises(RetryError):
        await call()

    assert len(attempts) == 3


@pytest.mark.unit
async def test_decorated_call_does_not_retry_non_retryable_error() -> None:
    """A non-transient error propagates immediately after a single attempt."""
    attempts: list[int] = []

    @with_llm_retry
    async def call() -> str:
        attempts.append(1)
        raise ValueError("permanent")

    with pytest.raises(ValueError, match="permanent"):
        await call()

    assert attempts == [1]


@pytest.mark.unit
def test_retry_policy_uses_configured_backoff(monkeypatch: pytest.MonkeyPatch) -> None:
    """The retry wiring pins the exponential back-off (multiplier 1, min 1 s, max 2 s)."""
    captured: dict[str, object] = {}

    def fake_wait_exponential(**kwargs: object) -> object:
        captured.update(kwargs)
        return wait_none()

    monkeypatch.setattr(retry_module, "wait_exponential", fake_wait_exponential)

    @with_llm_retry
    async def call() -> str:
        return "ok"

    assert captured["multiplier"] == 1
    assert captured["min"] == 1
    assert captured["max"] == 2

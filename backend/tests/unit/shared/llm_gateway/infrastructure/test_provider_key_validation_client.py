"""Unit tests for provider API-key validation dispatch and response mapping."""

from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest
import respx

from app.shared.llm_gateway.infrastructure import provider_key_validation_client as svc
from app.shared.llm_gateway.infrastructure.provider_key_validation_client import (
    _check_provider_status,
    _provider_error_message,
    call_provider,
)

pytestmark = pytest.mark.unit

_OPENAI = "https://api.openai.com/v1/models"
_ANTHROPIC = "https://api.anthropic.com/v1/models"
_MISTRAL = "https://api.mistral.ai/v1/models"
_GOOGLE = "https://generativelanguage.googleapis.com/v1/models"
_COHERE = "https://api.cohere.ai/v1/models"


def _resp(status: int, payload: dict[str, object] | None = None) -> httpx.Response:
    """Build a static httpx response for the mocked provider endpoint."""
    return httpx.Response(status, json=payload or {})


@pytest.mark.asyncio
async def test_call_provider_ollama_is_valid_without_http() -> None:
    """Ollama has no auth endpoint and is always considered valid."""
    result = await call_provider("ollama", "any-key")
    assert result.valid is True


@pytest.mark.asyncio
async def test_call_provider_unknown_provider_is_invalid() -> None:
    """An unsupported provider name is reported as invalid."""
    result = await call_provider("unknown-xyz", "any-key")
    assert result.valid is False
    assert "Unknown provider" in (result.error or "")


@respx.mock
@pytest.mark.parametrize(
    ("provider", "url"),
    [
        ("openai", _OPENAI),
        ("anthropic", _ANTHROPIC),
        ("mistralai", _MISTRAL),
        ("google", _GOOGLE),
        ("cohere", _COHERE),
    ],
)
async def test_call_provider_200_is_valid(provider: str, url: str) -> None:
    """HTTP 200 from any provider yields a valid result."""
    respx.get(url).mock(return_value=_resp(200))
    result = await call_provider(provider, "key")
    assert result.valid is True


@respx.mock
async def test_call_provider_openai_unauthorized_uses_nested_error_message() -> None:
    """A 401 OpenAI response reports the nested ``error.message``."""
    respx.get(_OPENAI).mock(return_value=_resp(401, {"error": {"message": "bad key"}}))
    result = await call_provider("openai", "key")
    assert result.valid is False
    assert result.error == "bad key"


@respx.mock
async def test_call_provider_mistral_forbidden_uses_flat_message() -> None:
    """A 403 Mistral response reports the flat ``message`` field."""
    respx.get(_MISTRAL).mock(return_value=_resp(403, {"message": "forbidden"}))
    result = await call_provider("mistralai", "key")
    assert result.valid is False
    assert result.error == "forbidden"


@respx.mock
async def test_call_provider_google_server_error_falls_back_to_http_status() -> None:
    """A 500 Google response without an error message falls back to the status code."""
    respx.get(_GOOGLE).mock(return_value=_resp(500, {"error": {}}))
    result = await call_provider("google", "key")
    assert result.valid is False
    assert "500" in (result.error or "")


@respx.mock
async def test_call_provider_network_error_is_wrapped_as_invalid() -> None:
    """A transport error is caught and surfaced as an invalid result."""
    respx.get(_ANTHROPIC).mock(side_effect=httpx.ConnectError("boom"))
    result = await call_provider("anthropic", "key")
    assert result.valid is False
    assert "boom" in (result.error or "")


def test_provider_error_message_nested_and_flat() -> None:
    """Nested extraction reads ``error.message``; flat reads ``message``."""
    nested = SimpleNamespace(
        status_code=401,
        json=lambda: {"error": {"message": "nested-msg"}},
    )
    flat = SimpleNamespace(
        status_code=403,
        json=lambda: {"message": "flat-msg"},
    )
    assert _provider_error_message(nested, nested=True) == "nested-msg"
    assert _provider_error_message(flat, nested=False) == "flat-msg"


def test_provider_error_message_falls_back_to_http_status() -> None:
    """Missing message fields fall back to the HTTP status code."""
    bare = SimpleNamespace(status_code=429, json=dict)
    assert _provider_error_message(bare, nested=True) == "HTTP 429"
    assert _provider_error_message(bare, nested=False) == "HTTP 429"


def test_check_provider_status_ok_and_error() -> None:
    """HTTP 200 → valid; non-200 → invalid with the mapped message."""
    ok = SimpleNamespace(status_code=200, json=dict)
    bad = SimpleNamespace(status_code=401, json=lambda: {"error": {"message": "no"}})

    assert _check_provider_status(ok, nested_error=True).valid is True
    invalid = _check_provider_status(bad, nested_error=True)
    assert invalid.valid is False
    assert invalid.error == "no"


def test_validation_client_uses_non_ok_constant() -> None:
    """The OK boundary is the provider-status constant (guards magic-number drift)."""
    assert svc._HTTP_OK == 200

"""Unit tests for LLM error classification and user-facing message rendering.

``errors`` maps opaque provider/resolution failures onto the standardised
``CallErrorType`` and renders a stable German message for each, so the same
failure always reads the same way in toasts and stream sentinels.
"""

from __future__ import annotations

import pytest

from app.shared.db_access.pool_guard import PoolGuardBlockedError
from app.shared.llm_gateway.client.errors import classify_exception, friendly_error_message
from app.shared.llm_gateway.exceptions import (
    CircuitBreakerOpenError,
    LangfuseUnreachableError,
    LLMCallError,
    LLMModelDisabledError,
    LLMValidationError,
    NoCredentialForTaskError,
    NoModelForTaskError,
    NoPromptForTaskError,
    PromptVariableMissingError,
)
from app.shared.llm_gateway.models.call_log import CallErrorType

pytestmark = pytest.mark.unit


class _ProviderError(Exception):
    """Provider error carrying a top-level ``status_code`` (OpenAI SDK shape)."""

    def __init__(self, status_code: int) -> None:
        self.status_code = status_code
        super().__init__(f"provider error {status_code}")


class _Response:
    """Minimal HTTP response exposing only a status code."""

    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


class _NestedStatusError(Exception):
    """Provider error exposing the status code on a nested ``response`` object."""

    def __init__(self, status_code: int) -> None:
        self.response = _Response(status_code)
        super().__init__("nested status error")


class _HttpStatusError(Exception):
    """Provider error exposing the status code as ``http_status``."""

    def __init__(self, http_status: int) -> None:
        self.http_status = http_status
        super().__init__("http_status error")


class _CodeError(Exception):
    """Provider error exposing the status code as ``code``."""

    def __init__(self, code: int) -> None:
        self.code = code
        super().__init__("code error")


@pytest.mark.parametrize(
    ("exception", "expected"),
    [
        pytest.param(NoModelForTaskError("x"), CallErrorType.NO_MAPPING, id="no-mapping"),
        pytest.param(LLMModelDisabledError("x"), CallErrorType.MODEL_DISABLED, id="model-disabled"),
        pytest.param(NoCredentialForTaskError("x"), CallErrorType.NO_CREDENTIAL, id="no-credential"),
        pytest.param(NoPromptForTaskError("x"), CallErrorType.NO_PROMPT, id="no-prompt"),
        pytest.param(PromptVariableMissingError("x"), CallErrorType.PROMPT_VARIABLE_MISSING, id="prompt-variable"),
        pytest.param(LLMValidationError("x"), CallErrorType.VALIDATION_ERROR, id="validation"),
        pytest.param(CircuitBreakerOpenError("x"), CallErrorType.CIRCUIT_OPEN, id="circuit-open"),
    ],
)
def test_classify_exception_maps_resolution_exceptions(exception: BaseException, expected: CallErrorType) -> None:
    """Every resolution/infrastructure exception maps onto its stable type."""
    assert classify_exception(exception) == expected


@pytest.mark.parametrize(
    ("status_code", "expected"),
    [
        pytest.param(401, CallErrorType.CREDENTIAL_INVALID, id="unauthorized"),
        pytest.param(403, CallErrorType.CREDENTIAL_INVALID, id="forbidden"),
        pytest.param(402, CallErrorType.PROVIDER_ERROR, id="payment-required"),
        pytest.param(429, CallErrorType.RATE_LIMIT, id="rate-limit"),
        pytest.param(500, CallErrorType.PROVIDER_ERROR, id="server-error"),
    ],
)
def test_classify_exception_maps_provider_status_codes(status_code: int, expected: CallErrorType) -> None:
    """Provider HTTP status codes classify the failure before message heuristics."""
    assert classify_exception(_ProviderError(status_code)) == expected


def test_classify_exception_reads_status_code_from_nested_response() -> None:
    """A status code nested on ``response.status_code`` is honoured."""
    assert classify_exception(_NestedStatusError(429)) == CallErrorType.RATE_LIMIT


def test_classify_exception_reads_http_status_attribute() -> None:
    """A status code exposed as ``http_status`` is honoured."""
    assert classify_exception(_HttpStatusError(401)) == CallErrorType.CREDENTIAL_INVALID


def test_classify_exception_reads_code_attribute() -> None:
    """A status code exposed as ``code`` is honoured."""
    assert classify_exception(_CodeError(429)) == CallErrorType.RATE_LIMIT


def test_classify_exception_uses_rate_limit_keyword_for_provider_error() -> None:
    """A provider failure without a status code is classified by its rate-limit phrase."""
    assert classify_exception(LLMCallError("You exceeded the rate limit")) == CallErrorType.RATE_LIMIT


def test_classify_exception_uses_credential_keyword_for_provider_error() -> None:
    """A provider failure without a status code is classified by its credential phrase."""
    assert classify_exception(LLMCallError("Invalid API key provided")) == CallErrorType.CREDENTIAL_INVALID


def test_classify_exception_maps_langfuse_unreachable_error() -> None:
    """A dedicated Langfuse-unreachable error keeps its own bucket."""
    assert classify_exception(LangfuseUnreachableError("down")) == CallErrorType.LANGFUSE_UNREACHABLE


def test_classify_exception_maps_pool_guard_block_to_circuit_open() -> None:
    """A pool-guard block is treated like an open circuit (transient, retryable)."""
    assert classify_exception(PoolGuardBlockedError("busy")) == CallErrorType.CIRCUIT_OPEN


def test_classify_exception_walks_cause_chain_to_provider_error() -> None:
    """A wrapper error is classified by walking to its provider cause."""
    error = LLMCallError("wrapper")
    error.__cause__ = _ProviderError(429)

    assert classify_exception(error) == CallErrorType.RATE_LIMIT


def test_classify_exception_maps_disabled_model_wrapped_in_call_error() -> None:
    """A disabled-model cause inside a call error keeps the model-disabled bucket."""
    error = LLMCallError("wrapper")
    error.__cause__ = LLMModelDisabledError("inactive")

    assert classify_exception(error) == CallErrorType.MODEL_DISABLED


def test_classify_exception_maps_connection_refused_to_langfuse_unreachable() -> None:
    """A raw connection refusal is attributed to Langfuse being unreachable."""
    assert classify_exception(ConnectionRefusedError("refused")) == CallErrorType.LANGFUSE_UNREACHABLE


def test_classify_exception_falls_back_to_unknown() -> None:
    """An unrecognised error maps onto the stable unknown bucket."""
    assert classify_exception(RuntimeError("odd failure")) == CallErrorType.UNKNOWN


@pytest.mark.parametrize(
    ("exception", "expected_fragment"),
    [
        pytest.param(NoModelForTaskError("x"), "Modell-Mapping", id="no-mapping"),
        pytest.param(LLMModelDisabledError("x"), "deaktiviert", id="model-disabled"),
        pytest.param(NoCredentialForTaskError("x"), "Credential", id="no-credential"),
        pytest.param(NoPromptForTaskError("x"), "Prompt", id="no-prompt"),
        pytest.param(PromptVariableMissingError("x"), "Variable", id="prompt-variable"),
        pytest.param(LLMValidationError("x"), "Format", id="validation"),
        pytest.param(CircuitBreakerOpenError("x"), "Circuit Breaker", id="circuit-open"),
        pytest.param(LangfuseUnreachableError("x"), "LangFuse", id="langfuse"),
        pytest.param(_ProviderError(429), "Rate-Limit", id="rate-limit"),
        pytest.param(_ProviderError(401), "abgelehnt", id="credential-invalid"),
        pytest.param(_ProviderError(500), "Anbieter", id="provider-error"),
    ],
)
def test_friendly_error_message_returns_actionable_german_text(
    exception: BaseException,
    expected_fragment: str,
) -> None:
    """Each failure type renders its specific, actionable German sentence."""
    assert expected_fragment in friendly_error_message(exception)


def test_friendly_error_message_uses_unknown_fallback_for_unmapped_error() -> None:
    """Unrecognised failures fall back to the generic unknown message."""
    assert "Unbekannter Fehler" in friendly_error_message(RuntimeError("odd failure"))

"""Unit tests for the LLM client's public error-classification helpers."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.client.client import classify_exception, friendly_error_message
from app.shared.llm_gateway.exceptions import (
    LLMModelDisabledError,
    LLMValidationError,
    NoCredentialForTaskError,
    NoModelForTaskError,
    NoPromptForTaskError,
    PromptVariableMissingError,
)
from app.shared.llm_gateway.models.call_log import CallErrorType


class _ProviderError(Exception):
    """Provider error carrying an HTTP status code (as OpenAI errors do)."""

    def __init__(self, status_code: int) -> None:
        self.status_code = status_code
        super().__init__(f"provider error {status_code}")


@pytest.mark.unit
def test_classify_exception_maps_resolution_errors_to_standard_types() -> None:
    """Each resolution exception maps onto its stable CallErrorType."""
    assert classify_exception(NoModelForTaskError("x")) == CallErrorType.NO_MAPPING
    assert classify_exception(LLMModelDisabledError("x")) == CallErrorType.MODEL_DISABLED
    assert classify_exception(NoCredentialForTaskError("x")) == CallErrorType.NO_CREDENTIAL
    assert classify_exception(NoPromptForTaskError("x")) == CallErrorType.NO_PROMPT
    assert classify_exception(PromptVariableMissingError("x")) == CallErrorType.PROMPT_VARIABLE_MISSING
    assert classify_exception(LLMValidationError("x")) == CallErrorType.VALIDATION_ERROR


@pytest.mark.unit
def test_classify_exception_reads_http_status_code_from_provider_error() -> None:
    """Provider failures are classified by their HTTP status code."""
    assert classify_exception(_ProviderError(429)) == CallErrorType.RATE_LIMIT
    assert classify_exception(_ProviderError(401)) == CallErrorType.CREDENTIAL_INVALID
    assert classify_exception(_ProviderError(500)) == CallErrorType.PROVIDER_ERROR


@pytest.mark.unit
def test_classify_exception_falls_back_to_unknown() -> None:
    """An unrecognised error maps onto the stable unknown bucket."""
    assert classify_exception(RuntimeError("odd")) == CallErrorType.UNKNOWN


@pytest.mark.unit
def test_friendly_error_message_returns_actionable_german_text() -> None:
    """Known failures produce a concrete German user-facing message."""
    message = friendly_error_message(NoModelForTaskError("x"))

    assert "Modell" in message


@pytest.mark.unit
def test_friendly_error_message_uses_unknown_fallback_for_unmapped_error() -> None:
    """Unrecognised failures fall back to the generic unknown message."""
    message = friendly_error_message(RuntimeError("odd"))

    assert "Unbekannter Fehler" in message

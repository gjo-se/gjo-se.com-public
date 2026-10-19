"""Provider-side validation of a user's LLM API key.

Dispatches a minimal auth-check request to the configured provider and maps
the response to a :class:`UserApiKeyValidationOut`.
"""

from __future__ import annotations

import httpx
import structlog

from app.shared.llm_gateway.schemas.user_api_key_schemas import UserApiKeyValidationOut

logger = structlog.get_logger(__name__)

_HTTP_OK: int = httpx.codes.OK  # 200

_OPENAI_VALIDATE_URL = "https://api.openai.com/v1/models"
_ANTHROPIC_VALIDATE_URL = "https://api.anthropic.com/v1/models"
_ANTHROPIC_API_VERSION = "2023-06-01"
_MISTRAL_VALIDATE_URL = "https://api.mistral.ai/v1/models"
_GOOGLE_VALIDATE_URL = "https://generativelanguage.googleapis.com/v1/models"
_COHERE_VALIDATE_URL = "https://api.cohere.ai/v1/models"


async def call_provider(provider: str, api_key: str) -> UserApiKeyValidationOut:
    """Dispatch a minimal auth-check request to the given provider.

    Args:
        provider: One of 'openai', 'anthropic', 'mistralai', 'google',
            'cohere', 'ollama'.
        api_key: Decrypted plaintext API key.

    Returns:
        UserApiKeyValidationOut indicating success or failure.
    """
    if provider == "ollama":
        return UserApiKeyValidationOut(valid=True)

    if provider == "openai":
        return await _validate_openai(api_key)

    if provider == "anthropic":
        return await _validate_anthropic(api_key)

    if provider == "mistralai":
        return await _validate_mistral(api_key)

    if provider == "google":
        return await _validate_google(api_key)

    if provider == "cohere":
        return await _validate_cohere(api_key)

    return UserApiKeyValidationOut(valid=False, error=f"Unknown provider: '{provider}'")


def _provider_error_message(response: httpx.Response, *, nested: bool) -> str:
    """Extract the provider's error message from a non-OK validation response.

    Args:
        response: Non-OK provider response.
        nested: True when the message lives under ``error.message`` (OpenAI-style).

    Returns:
        Human-readable provider error message.
    """
    if nested:
        error_body = response.json().get("error", {})
        return error_body.get("message", f"HTTP {response.status_code}")
    message = response.json().get("message", f"HTTP {response.status_code}")
    return str(message)


def _check_provider_status(response: httpx.Response, *, nested_error: bool) -> UserApiKeyValidationOut:
    """Map a provider response to a validation result.

    Args:
        response: Provider response.
        nested_error: True when the error message is nested under ``error.message``.

    Returns:
        Valid result on HTTP 200, otherwise an invalid result with the error message.
    """
    if response.status_code == _HTTP_OK:
        return UserApiKeyValidationOut(valid=True)
    return UserApiKeyValidationOut(valid=False, error=_provider_error_message(response, nested=nested_error))


def _validation_failed(label: str, exc: Exception) -> UserApiKeyValidationOut:
    """Log and wrap a validation exception as an invalid result.

    Args:
        label: Provider label for the log line, e.g. ``'OpenAI'``.
        exc: The caught exception.

    Returns:
        Invalid :class:`UserApiKeyValidationOut` carrying the error text.
    """
    logger.warning("%s key validation failed: %s", label, exc)
    return UserApiKeyValidationOut(valid=False, error=str(exc))


async def _validate_openai(api_key: str) -> UserApiKeyValidationOut:
    """Validate an OpenAI key via GET /v1/models."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.get(
                _OPENAI_VALIDATE_URL,
                headers={"Authorization": f"Bearer {api_key}"},
            )
        return _check_provider_status(response, nested_error=True)
    except (httpx.HTTPError, ValueError, AttributeError) as exc:
        return _validation_failed("OpenAI", exc)


async def _validate_anthropic(api_key: str) -> UserApiKeyValidationOut:
    """Validate an Anthropic key via GET /v1/models."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.get(
                _ANTHROPIC_VALIDATE_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": _ANTHROPIC_API_VERSION,
                },
            )
        return _check_provider_status(response, nested_error=True)
    except (httpx.HTTPError, ValueError, AttributeError) as exc:
        return _validation_failed("Anthropic", exc)


async def _validate_mistral(api_key: str) -> UserApiKeyValidationOut:
    """Validate a Mistral key via GET /v1/models."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.get(
                _MISTRAL_VALIDATE_URL,
                headers={"Authorization": f"Bearer {api_key}"},
            )
        return _check_provider_status(response, nested_error=False)
    except (httpx.HTTPError, ValueError, AttributeError) as exc:
        return _validation_failed("Mistral", exc)


async def _validate_google(api_key: str) -> UserApiKeyValidationOut:
    """Validate a Google Gemini key via GET /v1/models."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.get(
                _GOOGLE_VALIDATE_URL,
                params={"key": api_key},
            )
        return _check_provider_status(response, nested_error=True)
    except (httpx.HTTPError, ValueError, AttributeError) as exc:
        return _validation_failed("Google", exc)


async def _validate_cohere(api_key: str) -> UserApiKeyValidationOut:
    """Validate a Cohere key via GET /v1/models."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.get(
                _COHERE_VALIDATE_URL,
                headers={"Authorization": f"Bearer {api_key}"},
            )
        return _check_provider_status(response, nested_error=False)
    except (httpx.HTTPError, ValueError, AttributeError) as exc:
        return _validation_failed("Cohere", exc)

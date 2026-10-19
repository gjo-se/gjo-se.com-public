"""Error classification and user-facing messages for LLM calls.

Maps opaque provider failures and resolution exceptions onto the standardised
:class:`CallErrorType` used by the call log, and renders a stable German
message for each so toasts and stream sentinels read the same way.
"""

from __future__ import annotations

from app.shared.llm_gateway.exceptions import (
    CircuitBreakerOpenError,
    LLMCallError,
    LLMModelDisabledError,
    LLMValidationError,
    NoCredentialForTaskError,
    NoModelForTaskError,
    NoPromptForTaskError,
    PromptVariableMissingError,
)
from app.shared.llm_gateway.models.call_log import CallErrorType

_HTTP_UNAUTHORIZED = 401
_HTTP_PAYMENT_REQUIRED = 402
_HTTP_FORBIDDEN = 403
_HTTP_TOO_MANY_REQUESTS = 429

_CREDENTIAL_ERROR_HINTS = (
    "unauthorized",
    "authentication",
    "invalid api key",
    "invalid_api_key",
    "api key",
    "credential",
    "permission",
)
_RATE_LIMIT_HINTS = ("rate limit", "rate_limit", "too many requests")


def _status_code_of(exc: BaseException) -> int | None:
    """Best-effort extraction of an HTTP status code from a provider error.

    Args:
        exc: Any exception (typically an OpenAI-compatible provider error).

    Returns:
        The HTTP status code if present, else ``None``.
    """
    for attr in ("status_code", "http_status", "code"):
        value = getattr(exc, attr, None)
        if isinstance(value, int):
            return value
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    return status_code if isinstance(status_code, int) else None


def _classify_provider_error(exc: BaseException) -> CallErrorType:
    """Classify an underlying provider error heuristically.

    Uses HTTP status code first, then message keywords, to map an opaque
    provider failure onto a standardised error type.

    Args:
        exc: The provider exception (or wrapper).

    Returns:
        The matching :class:`CallErrorType`.
    """
    status_code = _status_code_of(exc)
    if status_code == _HTTP_TOO_MANY_REQUESTS:
        return CallErrorType.RATE_LIMIT
    if status_code in (_HTTP_UNAUTHORIZED, _HTTP_FORBIDDEN):
        return CallErrorType.CREDENTIAL_INVALID
    if status_code == _HTTP_PAYMENT_REQUIRED:
        return CallErrorType.PROVIDER_ERROR

    message = str(exc).casefold()
    if any(hint in message for hint in _RATE_LIMIT_HINTS):
        return CallErrorType.RATE_LIMIT
    if any(hint in message for hint in _CREDENTIAL_ERROR_HINTS):
        return CallErrorType.CREDENTIAL_INVALID
    return CallErrorType.PROVIDER_ERROR


def _classify_known_exception(exc: BaseException) -> CallErrorType | None:
    """Map module-level-imported resolution exceptions; ``None`` if not matched."""
    if isinstance(exc, LLMModelDisabledError):
        return CallErrorType.MODEL_DISABLED
    if isinstance(exc, NoModelForTaskError):
        return CallErrorType.NO_MAPPING
    if isinstance(exc, NoCredentialForTaskError):
        return CallErrorType.NO_CREDENTIAL
    if isinstance(exc, NoPromptForTaskError):
        return CallErrorType.NO_PROMPT
    if isinstance(exc, PromptVariableMissingError):
        return CallErrorType.PROMPT_VARIABLE_MISSING
    if isinstance(exc, LLMValidationError):
        return CallErrorType.VALIDATION_ERROR
    if isinstance(exc, CircuitBreakerOpenError):
        return CallErrorType.CIRCUIT_OPEN
    return None


def classify_exception(exc: BaseException) -> CallErrorType:
    """Map any raised exception onto a standardised :class:`CallErrorType`.

    Resolution exceptions map directly; provider failures (also when wrapped in
    :class:`LLMCallError`) are classified heuristically by walking the
    ``__cause__`` chain.

    Args:
        exc: The exception raised by an LLM call.

    Returns:
        The standardised error type.
    """
    known = _classify_known_exception(exc)
    if known is not None:
        return known

    from app.shared.llm_gateway.exceptions import LangfuseUnreachableError

    if isinstance(exc, LangfuseUnreachableError):
        return CallErrorType.LANGFUSE_UNREACHABLE

    # PoolGuard blocked → same behaviour as circuit open (transient, retryable)
    from app.shared.db_access.pool_guard import PoolGuardBlockedError

    if isinstance(exc, PoolGuardBlockedError):
        return CallErrorType.CIRCUIT_OPEN

    # Provider failures surface as LLMCallError wrapping the real cause.
    cursor: BaseException | None = exc
    while cursor is not None:
        if isinstance(cursor, LLMModelDisabledError | NoModelForTaskError):
            return classify_exception(cursor)
        status_code = _status_code_of(cursor)
        if status_code is not None:
            return _classify_provider_error(cursor)
        cursor = cursor.__cause__

    if isinstance(exc, LLMCallError):
        return _classify_provider_error(exc)

    # Raw ConnectionRefusedError (errno 111) — likely LangFuse or
    # another internal service unreachable.
    if isinstance(exc, ConnectionRefusedError):
        return CallErrorType.LANGFUSE_UNREACHABLE

    return CallErrorType.UNKNOWN


_FRIENDLY_MESSAGES: dict[CallErrorType, str] = {
    CallErrorType.NO_MAPPING: (
        "Kein aktives Modell-Mapping für diesen Use-Case. Bitte im LLM-Bereich ein Modell zuordnen und aktivieren."
    ),
    CallErrorType.MODEL_DISABLED: (
        "Das zugeordnete Modell ist deaktiviert. Bitte im LLM-Bereich ein aktives Modell zuordnen."
    ),
    CallErrorType.NO_CREDENTIAL: (
        "Kein gültiges Credential für diesen Use-Case hinterlegt. Bitte ein aktives Credential zuordnen."
    ),
    CallErrorType.CREDENTIAL_INVALID: (
        "Das Credential wurde vom Anbieter abgelehnt "
        "(ungültiger API-Key oder fehlende Berechtigung). "
        "Bitte den API-Key prüfen."
    ),
    CallErrorType.NO_PROMPT: (
        "Kein aktiver Prompt für diesen Use-Case hinterlegt. Bitte im LLM-Bereich einen Prompt anlegen und aktivieren."
    ),
    CallErrorType.PROMPT_VARIABLE_MISSING: (
        "Im Prompt fehlt eine benötigte Variable. Bitte die Platzhalter des Prompts prüfen."
    ),
    CallErrorType.PROVIDER_ERROR: ("Der LLM-Anbieter hat einen Fehler zurückgegeben. Bitte später erneut versuchen."),
    CallErrorType.RATE_LIMIT: ("Das Rate-Limit des Anbieters wurde erreicht. Bitte kurz warten und erneut versuchen."),
    CallErrorType.VALIDATION_ERROR: (
        "Die Antwort des Modells entsprach nicht dem erwarteten Format. Bitte erneut versuchen."
    ),
    CallErrorType.UNKNOWN: ("Unbekannter Fehler beim LLM-Aufruf. Bitte den Fehler-Log prüfen."),
    CallErrorType.CIRCUIT_OPEN: (
        "Der Circuit Breaker ist für diesen Anbieter geöffnet. Bitte warten oder manuell zurücksetzen."
    ),
    CallErrorType.LANGFUSE_UNREACHABLE: (
        "LangFuse ist nicht erreichbar — Prompt-Templates können nicht "
        "geladen werden. Bitte LangFuse-Container starten: "
        "docker compose -f docker-compose.langfuse.yml up -d"
    ),
}


def friendly_error_message(exc: BaseException) -> str:
    """Return a clear, actionable German message for a raised LLM exception.

    Maps the standardised error type onto a user-facing sentence so the same
    failure always reads the same way in toasts and stream sentinels.

    Args:
        exc: The exception raised by an LLM call.

    Returns:
        A human-readable German error message.
    """
    return _FRIENDLY_MESSAGES.get(classify_exception(exc), _FRIENDLY_MESSAGES[CallErrorType.UNKNOWN])

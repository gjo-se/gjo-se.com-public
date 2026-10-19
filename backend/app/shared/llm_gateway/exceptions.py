"""LLM-specific exceptions for shared/llm_gateway."""

from app.shared.llm_gateway.models.call_log import CallErrorType

# ── Auto-Retry classification ────────────────────────────────────────────────

AUTO_RETRYABLE_TYPES: frozenset[CallErrorType] = frozenset(
    {
        CallErrorType.PROVIDER_ERROR,
        CallErrorType.RATE_LIMIT,
    }
)
"""Error types eligible for automatic retry via Restate.

Only transient errors are retryable – PROVIDER_ERROR (upstream 5xx),
RATE_LIMIT (429).  VALIDATION_ERROR is excluded because the LLM output
does not match the Pydantic schema – a retry with the same prompt will
not fix the schema.

Configuration errors (NO_MAPPING, NO_CREDENTIAL, …) and infrastructure
errors (LANGFUSE_UNREACHABLE) are also excluded — retrying won't help.
"""

CIRCUIT_OPEN_ERROR_TYPE: str = CallErrorType.CIRCUIT_OPEN.value
"""String value of :attr:`CallErrorType.CIRCUIT_OPEN` for query-free services."""


class LLMCallError(RuntimeError):
    """Raised when all retry attempts for an LLM call are exhausted."""


class LLMValidationError(ValueError):
    """Raised when the LLM response does not match the expected Pydantic schema."""


class UserApiKeyNotFoundError(KeyError):
    """Raised when no API key is stored for a given user/provider combination."""


class LLMModelDisabledError(RuntimeError):
    """Raised when an LLM model is inactive or not found in the registry."""


class NoModelForTaskError(RuntimeError):
    """Raised when no model suggestion exists for the given task."""


class NoCredentialForTaskError(RuntimeError):
    """Raised when no valid AdminCredential exists for the resolved task mapping."""


class NoPromptForTaskError(RuntimeError):
    """Raised when no active prompt template exists for the given task."""


class PromptVariableMissingError(RuntimeError):
    """Raised when required placeholder variables are missing from the variables dict."""


class CircuitBreakerOpenError(RuntimeError):
    """Raised when an LLM call is blocked because the circuit breaker is OPEN."""


class LangfuseUnreachableError(ConnectionError):
    """Raised when LangFuse is configured but unreachable.

    All prompt resolution and OTEL trace export depends on LangFuse.
    When it is down, LLM calls cannot proceed because prompt templates
    are fetched from LangFuse at call time.
    """

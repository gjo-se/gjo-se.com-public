"""Tenacity-based retry decorator for transient LLM provider errors."""

from collections.abc import Callable

from openai import APIConnectionError as OpenAIConnectionError
from openai import APITimeoutError as OpenAITimeoutError
from openai import RateLimitError as OpenAIRateLimitError
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

_MAX_ATTEMPTS = 3  # 1 initial attempt + 2 retries
_WAIT_MIN_SECONDS = 1
_WAIT_MAX_SECONDS = 2

_RETRYABLE_ERRORS: tuple[type[Exception], ...] = (
    OpenAIRateLimitError,
    OpenAITimeoutError,
    OpenAIConnectionError,
)


def with_llm_retry[F: Callable[..., object]](fn: F) -> F:
    """Decorate ``fn`` with tenacity retry logic for transient LLM errors.

    Retries on ``RateLimitError``, ``APITimeoutError``, and
    ``APIConnectionError`` (openai).  At most 2 retries are performed with
    exponential back-off (1 s, 2 s).  After all attempts are exhausted
    ``tenacity.RetryError`` is raised.

    Args:
        fn: Callable to wrap.

    Returns:
        Wrapped callable with retry behaviour.
    """
    return retry(  # type: ignore[return-value]
        retry=retry_if_exception_type(_RETRYABLE_ERRORS),
        stop=stop_after_attempt(_MAX_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=_WAIT_MIN_SECONDS, max=_WAIT_MAX_SECONDS),
        reraise=False,
    )(fn)

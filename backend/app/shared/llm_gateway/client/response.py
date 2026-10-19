"""Normalisation of raw provider responses (content → text, usage → tokens)."""

from __future__ import annotations

from typing import Any

import structlog

_logger = structlog.get_logger(__name__)


def chunk_to_text(content: object) -> str:
    """Normalise a LangChain message content into a plain string.

    Some providers return content as a string, others as a list of content
    blocks (e.g. ``{"type": "text", "text": "..."}``).

    Args:
        content: The ``.content`` of a message or message chunk.

    Returns:
        The concatenated text.
    """
    if isinstance(content, list):
        return "".join(part if isinstance(part, str) else str(part.get("text", "")) for part in content)
    return str(content)


def extract_usage(message: Any) -> dict[str, int] | None:
    """Normalise provider/LangChain token usage into prompt/completion/total.

    DeepSeek exposes ``token_usage`` on ``response_metadata``; OpenAI-compatible
    providers may use ``usage``; LangChain ``AIMessage`` instances expose
    ``usage_metadata`` with ``input_tokens``/``output_tokens``/``total_tokens``.

    Args:
        message: The raw ``AIMessage`` returned by the model invocation.

    Returns:
        A dict with ``prompt_tokens``/``completion_tokens``/``total_tokens``,
        or ``None`` when no usage data is available (best effort).
    """
    try:
        metadata = getattr(message, "response_metadata", None) or {}
        usage = metadata.get("token_usage") or metadata.get("usage")
        if not usage:
            usage_meta = getattr(message, "usage_metadata", None)
            if usage_meta:
                usage = {
                    "prompt_tokens": usage_meta.get("input_tokens"),
                    "completion_tokens": usage_meta.get("output_tokens"),
                    "total_tokens": usage_meta.get("total_tokens"),
                }
    except Exception:
        _logger.exception("LLMClient: failed to extract token usage")
        return None
    if not usage:
        return None
    return {
        "prompt_tokens": int(usage.get("prompt_tokens") or 0),
        "completion_tokens": int(usage.get("completion_tokens") or 0),
        "total_tokens": int(usage.get("total_tokens") or 0),
    }

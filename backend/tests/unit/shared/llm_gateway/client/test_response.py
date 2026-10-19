"""Unit tests for raw provider-response normalisation (content → text, usage → tokens)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.shared.llm_gateway.client.response import chunk_to_text, extract_usage

pytestmark = pytest.mark.unit


def test_chunk_to_text_returns_string_content_unchanged() -> None:
    """A plain string content is passed through as-is."""
    assert chunk_to_text("hello") == "hello"


def test_chunk_to_text_joins_string_block_list() -> None:
    """A list of string blocks is concatenated in order."""
    assert chunk_to_text(["a", "b", "c"]) == "abc"


def test_chunk_to_text_extracts_text_from_content_blocks() -> None:
    """Content-block dicts contribute their ``text`` field."""
    blocks = [{"type": "text", "text": "a"}, {"type": "text", "text": "b"}]

    assert chunk_to_text(blocks) == "ab"


def test_chunk_to_text_handles_mixed_blocks() -> None:
    """String blocks and content-block dicts can be mixed."""
    assert chunk_to_text(["a", {"text": "b"}]) == "ab"


def test_chunk_to_text_stringifies_non_string_scalar() -> None:
    """A non-list, non-string content value is stringified."""
    assert chunk_to_text(123) == "123"


def test_extract_usage_returns_none_without_metadata() -> None:
    """A message without any usage metadata yields ``None``."""
    assert extract_usage(SimpleNamespace()) is None


def test_extract_usage_reads_token_usage_from_response_metadata() -> None:
    """A ``token_usage`` entry on ``response_metadata`` is normalised (DeepSeek shape)."""
    message = SimpleNamespace(
        response_metadata={"token_usage": {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12}},
    )

    assert extract_usage(message) == {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12}


def test_extract_usage_reads_usage_from_response_metadata() -> None:
    """A ``usage`` entry on ``response_metadata`` is normalised (OpenAI shape)."""
    message = SimpleNamespace(
        response_metadata={"usage": {"prompt_tokens": 3, "completion_tokens": 4, "total_tokens": 7}},
    )

    assert extract_usage(message) == {"prompt_tokens": 3, "completion_tokens": 4, "total_tokens": 7}


def test_extract_usage_falls_back_to_usage_metadata_tokens() -> None:
    """LangChain ``usage_metadata`` input/output tokens map onto prompt/completion."""
    message = SimpleNamespace(usage_metadata={"input_tokens": 3, "output_tokens": 4, "total_tokens": 7})

    assert extract_usage(message) == {"prompt_tokens": 3, "completion_tokens": 4, "total_tokens": 7}


def test_extract_usage_defaults_missing_token_fields_to_zero() -> None:
    """Absent token fields default to ``0`` instead of ``None``."""
    message = SimpleNamespace(response_metadata={"token_usage": {"prompt_tokens": 5}})

    assert extract_usage(message) == {"prompt_tokens": 5, "completion_tokens": 0, "total_tokens": 0}


def test_extract_usage_returns_none_for_empty_metadata() -> None:
    """Empty metadata containers yield ``None`` (best effort, no usage data)."""
    assert extract_usage(SimpleNamespace(response_metadata={})) is None

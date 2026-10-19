"""Unit tests for Ticket #864: LLMModelResponse schema – OR fields.

Covers:
- All 10 new OR fields have correct nullable defaults
- JSON fields accept dict values
- Integer/String fields accept values
- is_locally_installed: default is False
- Full LLMModelResponse constructable with required fields only
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.shared.llm_gateway.schemas.model_schemas import LLMModelResponse

# ── Helpers ───────────────────────────────────────────────────────────────────

_NOW = datetime.now(UTC)

_REQUIRED = {
    "id": 1,
    "openrouter_id": "openai/gpt-4o-mini",
    "native_model_id": "gpt-4o-mini",
    "provider_id": 1,
    "provider_name": "openai",
    "provider_display_name": "OpenAI",
    "display_name": "GPT-4o Mini",
    "description": None,
    "context_window": 128_000,
    "active": True,
    "first_seen_at": _NOW,
    "last_seen_at": _NOW,
}


# ── nullable defaults ─────────────────────────────────────────────────────────


@pytest.mark.unit
def test_supported_parameters_default_is_none() -> None:
    """supported_parameters ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.supported_parameters is None


@pytest.mark.unit
def test_architecture_default_is_none() -> None:
    """architecture ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.architecture is None


@pytest.mark.unit
def test_reasoning_default_is_none() -> None:
    """reasoning ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.reasoning is None


@pytest.mark.unit
def test_default_parameters_default_is_none() -> None:
    """default_parameters ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.default_parameters is None


@pytest.mark.unit
def test_top_provider_default_is_none() -> None:
    """top_provider ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.top_provider is None


@pytest.mark.unit
def test_max_completion_tokens_default_is_none() -> None:
    """max_completion_tokens ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.max_completion_tokens is None


@pytest.mark.unit
def test_knowledge_cutoff_default_is_none() -> None:
    """knowledge_cutoff ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.knowledge_cutoff is None


@pytest.mark.unit
def test_hugging_face_id_default_is_none() -> None:
    """hugging_face_id ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.hugging_face_id is None


@pytest.mark.unit
def test_created_default_is_none() -> None:
    """created ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.created is None


@pytest.mark.unit
def test_canonical_slug_default_is_none() -> None:
    """canonical_slug ist ohne Angabe None."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.canonical_slug is None


# ── is_locally_installed ──────────────────────────────────────────────────────


@pytest.mark.unit
def test_is_locally_installed_default_is_false() -> None:
    """is_locally_installed Default ist False."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.is_locally_installed is False


@pytest.mark.unit
def test_is_locally_installed_can_be_set_true() -> None:
    """is_locally_installed kann auf True gesetzt werden."""
    schema = LLMModelResponse(**_REQUIRED, is_locally_installed=True)
    assert schema.is_locally_installed is True


# ── JSON field values ─────────────────────────────────────────────────────────


@pytest.mark.unit
def test_supported_parameters_accepts_list() -> None:
    """supported_parameters nimmt list korrekt an (OR liefert String-Array)."""
    params = ["max_tokens", "response_format", "tools"]
    schema = LLMModelResponse(**_REQUIRED, supported_parameters=params)
    assert schema.supported_parameters == params


@pytest.mark.unit
def test_architecture_accepts_dict() -> None:
    """architecture nimmt dict korrekt an."""
    arch = {"modality": "text", "tokenizer": "GPT-4"}
    schema = LLMModelResponse(**_REQUIRED, architecture=arch)
    assert schema.architecture == arch


@pytest.mark.unit
def test_top_provider_accepts_dict() -> None:
    """top_provider nimmt dict korrekt an."""
    provider_info = {"name": "openai", "uptime": 99.9}
    schema = LLMModelResponse(**_REQUIRED, top_provider=provider_info)
    assert schema.top_provider == provider_info


# ── scalar field values ───────────────────────────────────────────────────────


@pytest.mark.unit
def test_max_completion_tokens_accepts_int() -> None:
    """max_completion_tokens nimmt int korrekt an."""
    schema = LLMModelResponse(**_REQUIRED, max_completion_tokens=4096)
    assert schema.max_completion_tokens == 4096


@pytest.mark.unit
def test_knowledge_cutoff_accepts_str() -> None:
    """knowledge_cutoff nimmt str korrekt an."""
    schema = LLMModelResponse(**_REQUIRED, knowledge_cutoff="2024-06")
    assert schema.knowledge_cutoff == "2024-06"


@pytest.mark.unit
def test_hugging_face_id_accepts_str() -> None:
    """hugging_face_id nimmt str korrekt an."""
    hf_id = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"
    schema = LLMModelResponse(**_REQUIRED, hugging_face_id=hf_id)
    assert schema.hugging_face_id == hf_id


@pytest.mark.unit
def test_created_accepts_int() -> None:
    """created nimmt int (Unix timestamp) korrekt an."""
    schema = LLMModelResponse(**_REQUIRED, created=1711234567)
    assert schema.created == 1711234567


@pytest.mark.unit
def test_canonical_slug_accepts_str() -> None:
    """canonical_slug nimmt str korrekt an."""
    schema = LLMModelResponse(**_REQUIRED, canonical_slug="gpt-4o-mini")
    assert schema.canonical_slug == "gpt-4o-mini"


# ── full OR model ─────────────────────────────────────────────────────────────


@pytest.mark.unit
def test_full_or_model_response() -> None:
    """Full OR model – all 10 OR fields set."""
    schema = LLMModelResponse(
        **_REQUIRED,
        supported_parameters=["max_tokens", "response_format"],
        architecture={"modality": "text"},
        reasoning={"supports_tool_calls": True},
        default_parameters={"temperature": None},
        top_provider={"name": "openai"},
        max_completion_tokens=128000,
        knowledge_cutoff="2024-06",
        hugging_face_id="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
        created=1711234567,
        canonical_slug="gpt-4o-mini",
        is_locally_installed=False,
    )
    assert schema.supported_parameters == ["max_tokens", "response_format"]
    assert schema.architecture == {"modality": "text"}
    assert schema.reasoning == {"supports_tool_calls": True}
    assert schema.default_parameters == {"temperature": None}
    assert schema.top_provider == {"name": "openai"}
    assert schema.max_completion_tokens == 128000
    assert schema.knowledge_cutoff == "2024-06"
    assert schema.hugging_face_id == "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"
    assert schema.created == 1711234567
    assert schema.canonical_slug == "gpt-4o-mini"
    assert schema.is_locally_installed is False


# ── OpenRouter model (all new fields NULL) ────────────────────────────────────


@pytest.mark.unit
def test_openrouter_model_new_fields_all_none() -> None:
    """Bestehende OpenRouter-Modelle: alle 10 neuen OR-Felder sind None/default."""
    schema = LLMModelResponse(**_REQUIRED)
    assert schema.supported_parameters is None
    assert schema.architecture is None
    assert schema.reasoning is None
    assert schema.default_parameters is None
    assert schema.top_provider is None
    assert schema.max_completion_tokens is None
    assert schema.knowledge_cutoff is None
    assert schema.hugging_face_id is None
    assert schema.created is None
    assert schema.canonical_slug is None
    assert schema.is_locally_installed is False

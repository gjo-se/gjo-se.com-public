"""Unit tests for the LLM provider service – 3-tier status mapping and creation."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from app.shared.llm_gateway.domain.provider_contract import ProviderRecord, ProviderStatusRecord
from app.shared.llm_gateway.services import provider_service
from app.shared.llm_gateway.services.provider_registry_service import is_supported
from app.shared.llm_gateway.services.provider_service import LLMProviderService, get_or_create_provider

pytestmark = pytest.mark.unit


def _status(
    *,
    provider_id: int = 1,
    name: str = "openai",
    key_id: int | None = None,
    valid_at: datetime | None = None,
    label: str | None = None,
) -> ProviderStatusRecord:
    """Build a repository status record stand-in."""
    return ProviderStatusRecord(
        id=provider_id,
        name=name,
        display_name=name.capitalize(),
        key_id=key_id,
        valid_at=valid_at,
        label=label,
    )


def _patch_records(monkeypatch: pytest.MonkeyPatch, records: list[ProviderStatusRecord]) -> None:
    monkeypatch.setattr(
        provider_service.provider_repository,
        "list_with_user_keys",
        AsyncMock(return_value=records),
    )


async def test_list_with_status_flags_present_and_valid_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """A record with a key row and a validation timestamp reports usable."""
    _patch_records(monkeypatch, [_status(key_id=7, valid_at=datetime(2026, 1, 1, tzinfo=UTC), label="work")])

    out = await LLMProviderService().list_with_status(AsyncMock(), user_id=1)

    assert out[0].has_key is True
    assert out[0].key_valid is True
    assert out[0].key_label == "work"


async def test_list_with_status_flags_absent_key_as_not_usable(monkeypatch: pytest.MonkeyPatch) -> None:
    """A record without a key row reports no key and no validity."""
    _patch_records(monkeypatch, [_status()])

    out = await LLMProviderService().list_with_status(AsyncMock(), user_id=1)

    assert out[0].has_key is False
    assert out[0].key_valid is False


async def test_list_with_status_maps_registry_and_identity(monkeypatch: pytest.MonkeyPatch) -> None:
    """Identity fields are forwarded and support tier comes from the registry."""
    _patch_records(monkeypatch, [_status(provider_id=42, name="openai")])

    out = await LLMProviderService().list_with_status(AsyncMock(), user_id=1)

    assert out[0].id == 42
    assert out[0].name == "openai"
    assert out[0].is_supported == is_supported("openai")


async def test_get_or_create_prefers_registry_display_name(monkeypatch: pytest.MonkeyPatch) -> None:
    """A known provider name resolves its display name from the registry."""
    captured: dict[str, str] = {}

    async def _get_or_create(_db: object, name: str, display_name: str) -> ProviderRecord:
        captured.update(name=name, display=display_name)
        return ProviderRecord(id=1, name=name, display_name=display_name)

    monkeypatch.setattr(provider_service.provider_repository, "get_or_create_by_name", _get_or_create)

    record = await get_or_create_provider(AsyncMock(), "openai")

    assert record.name == "openai"
    assert captured["display"] == provider_service.PROVIDER_DISPLAY_NAMES["openai"]


async def test_get_or_create_capitalizes_unknown_name(monkeypatch: pytest.MonkeyPatch) -> None:
    """An unknown provider name falls back to a capitalized display name."""
    captured: dict[str, object] = {}

    async def _get_or_create(_db: object, name: str, display_name: str) -> ProviderRecord:
        captured["display"] = display_name
        return ProviderRecord(id=1, name=name, display_name=display_name)

    monkeypatch.setattr(provider_service.provider_repository, "get_or_create_by_name", _get_or_create)

    await get_or_create_provider(AsyncMock(), "zzz-unknown")

    assert captured["display"] == "Zzz-unknown"

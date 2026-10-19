"""Unit tests for LLMModelService – sync, admin, query builders (#315, #316).

Prüft (session-frei, kein DB-Zugriff):
- patch_model(): Model nicht gefunden → LLMModelDisabledError (Fake-Session)
- Assertions auf die reinen Query-Builder-Helfer (_modality_conditions, _price_condition)
- assert_model_active(): missing/inactive → error; active → ok (Fake-Session)
- get_price_history(): mappt Snapshots der Reihe nach (Fake-Session)

Die API-Endpoint-Tests (real DB/Client) leben in
``tests/integration/shared/llm_gateway/services/test_model_service_admin_patch.py``.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.shared.llm_gateway.exceptions import LLMModelDisabledError
from app.shared.llm_gateway.schemas.model_schemas import LLMModelPatchIn
from app.shared.llm_gateway.services.model_service import (
    LLMModelService,
    _modality_conditions,
    _price_condition,
)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_patch_model_not_found_raises() -> None:
    """patch_model() mit nicht existentem model_id → LLMModelDisabledError."""
    service = LLMModelService()

    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)

    with pytest.raises(LLMModelDisabledError):
        await service.patch_model(db, model_id=9999, data=LLMModelPatchIn(is_locally_installed=True))


# ── Query-builder helpers (pure) ────────────────────────────────────────────


@pytest.mark.unit
def test_modality_conditions_count_matches_set_modalities() -> None:
    """Each set modality contributes exactly one condition."""
    assert _modality_conditions(None, None, None) == []
    assert len(_modality_conditions("text", None, None)) == 1
    assert len(_modality_conditions(None, "image", None)) == 1
    assert len(_modality_conditions(None, None, "text")) == 1
    assert len(_modality_conditions("text", "image", "video")) == 3


@pytest.mark.unit
def test_price_condition_requires_a_bound() -> None:
    """Without any price bound there is no condition; otherwise one is built."""
    assert _price_condition(None, None) is None
    assert _price_condition(1.0, None) is not None
    assert _price_condition(None, 5.0) is not None
    assert _price_condition(1.0, 5.0) is not None


@pytest.mark.unit
def test_apply_sorting_defaults_to_display_name() -> None:
    """An unknown/absent sort key falls back to display_name."""
    stmt = LLMModelService._build_base_query()

    out = LLMModelService._apply_sorting(stmt, None, None)

    assert "display_name" in str(out).lower()


@pytest.mark.unit
def test_apply_sorting_price_input_adds_label_column() -> None:
    """Sorting by price_input adds the correlated price label."""
    stmt = LLMModelService._build_base_query()

    out = LLMModelService._apply_sorting(stmt, "price_input", "desc")

    assert "_price_input" in str(out)


# ── assert_model_active / get_price_history (fake session) ──────────────────


class _ScalarDB:
    """Session double returning a fixed ``scalar()`` value."""

    def __init__(self, value: object) -> None:
        self._value = value

    async def scalar(self, _stmt: object) -> object:
        return self._value


@pytest.mark.unit
@pytest.mark.asyncio
async def test_assert_model_active_missing_raises() -> None:
    """A missing model cannot be asserted active."""
    with pytest.raises(LLMModelDisabledError):
        await LLMModelService().assert_model_active(_ScalarDB(None), 1)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_assert_model_active_disabled_raises() -> None:
    """An inactive model raises."""
    model = SimpleNamespace(active=False, openrouter_id="x")

    with pytest.raises(LLMModelDisabledError):
        await LLMModelService().assert_model_active(_ScalarDB(model), 1)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_assert_model_active_passes_for_active_model() -> None:
    """An active model passes without raising."""
    model = SimpleNamespace(active=True, openrouter_id="x")

    await LLMModelService().assert_model_active(_ScalarDB(model), 1)


class _HistoryResult:
    """Query result double for ``get_price_history``."""

    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def scalars(self) -> _HistoryResult:
        return self

    def all(self) -> list[object]:
        return self._rows


class _HistoryDB:
    """Session double returning a fixed snapshot list."""

    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    async def execute(self, _stmt: object) -> _HistoryResult:
        return _HistoryResult(self._rows)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_price_history_maps_snapshots() -> None:
    """Snapshots are mapped to response objects in order."""
    now = datetime(2026, 1, 1, tzinfo=UTC)
    snapshot = SimpleNamespace(
        id=1,
        model_id=2,
        price_input=Decimal("1.5"),
        price_output=Decimal("2.5"),
        source="openrouter",
        synced_at=now,
    )

    result = await LLMModelService().get_price_history(_HistoryDB([snapshot]), 2)

    assert len(result) == 1
    assert result[0].id == 1
    assert result[0].price_input == Decimal("1.5")

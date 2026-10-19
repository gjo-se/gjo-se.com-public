"""Unit tests for price_snapshot.py – LLMModelPriceSnapshot entity."""

from decimal import Decimal

import pytest

from app.shared.llm_gateway.models.price_snapshot import LLMModelPriceSnapshot


class TestLLMModelPriceSnapshot:
    """Tests for LLMModelPriceSnapshot ORM model."""

    @pytest.mark.unit
    def test_llm_model_price_snapshot_has_required_attributes(self) -> None:
        """Test: LLMModelPriceSnapshot has expected attributes."""
        snapshot = LLMModelPriceSnapshot(
            model_id=1,
            price_input=Decimal("0.00100000"),
            price_output=Decimal("0.00200000"),
        )

        assert hasattr(snapshot, "id")
        assert hasattr(snapshot, "model_id")
        assert hasattr(snapshot, "price_input")
        assert hasattr(snapshot, "price_output")
        assert hasattr(snapshot, "synced_at")

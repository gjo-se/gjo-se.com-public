"""Unit tests for the hyperparameter merge service."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.services.hyperparameter_service import HyperparameterService


@pytest.mark.unit
def test_merge_returns_defaults_when_no_overrides_given() -> None:
    """Without overrides the model defaults pass through unchanged."""
    defaults = {"temperature": 0.7, "max_tokens": 1000}

    assert HyperparameterService.merge(defaults) == {"temperature": 0.7, "max_tokens": 1000}


@pytest.mark.unit
def test_merge_override_wins_per_key_and_keeps_remaining_defaults() -> None:
    """Overrides replace their own key and leave every other default intact."""
    merged = HyperparameterService.merge(
        {"temperature": 0.7, "max_tokens": 1000},
        {"temperature": 0.3, "top_p": 0.9},
    )

    assert merged == {"temperature": 0.3, "max_tokens": 1000, "top_p": 0.9}


@pytest.mark.unit
def test_merge_does_not_mutate_the_defaults_mapping() -> None:
    """Merging returns a new dict and leaves the input untouched."""
    defaults = {"temperature": 0.7}

    HyperparameterService.merge(defaults, {"temperature": 0.3})

    assert defaults == {"temperature": 0.7}

"""Unit tests for the domain-free service-error to HTTP mapping."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.shared.http.domain.error_mapping_rules import (
    file_not_found_to_http,
    value_error_to_http,
)

pytestmark = pytest.mark.unit


def test_value_error_to_http_maps_not_found_to_404() -> None:
    """A 'not found' ValueError maps to the default 404 status."""
    result = value_error_to_http(ValueError("Skill not found: [3]"))

    assert isinstance(result, HTTPException)
    assert result.status_code == 404
    assert result.detail == "Skill not found: [3]"


def test_value_error_to_http_maps_conflict_marker_to_conflict_status() -> None:
    """A conflict marker maps to the configured conflict status."""
    result = value_error_to_http(
        ValueError("Tag 'x' already exists"),
        conflict_status=409,
    )

    assert result.status_code == 409


def test_value_error_to_http_falls_back_to_422() -> None:
    """An unmapped ValueError maps to 422."""
    result = value_error_to_http(ValueError("invalid color token"))

    assert result.status_code == 422


def test_value_error_to_http_honours_custom_not_found_status() -> None:
    """The not-found status is overridable."""
    result = value_error_to_http(ValueError("Project not found"), not_found_status=410)

    assert result.status_code == 410


def test_file_not_found_to_http_maps_to_500() -> None:
    """A FileNotFoundError maps to a 500 with the exception text as detail."""
    result = file_not_found_to_http(FileNotFoundError("template 'cv' missing"))

    assert result.status_code == 500
    assert result.detail == "template 'cv' missing"

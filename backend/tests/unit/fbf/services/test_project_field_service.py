"""Unit tests for the single-field project write use-cases (404 contract)."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi import HTTPException

from app.fbf.services import project_field_service

pytestmark = pytest.mark.unit


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("use_case", "repository_function", "value"),
    [
        (project_field_service.set_title_normalized, "set_title_normalized", "T"),
        (project_field_service.set_notes, "set_notes", "note"),
        (project_field_service.set_hourly_rate, "set_hourly_rate", 80),
        (project_field_service.set_my_hourly_rate, "set_my_hourly_rate", 70),
        (project_field_service.set_my_start_date, "set_my_start_date", "01/2026"),
    ],
)
async def test_missing_project_raises_404(
    monkeypatch: pytest.MonkeyPatch,
    use_case: Any,
    repository_function: str,
    value: Any,
) -> None:
    """Every ``set_*`` use-case translates a missing project into 404."""

    async def _none(_db: Any, _project_id: int, _value: Any) -> None:
        return None

    monkeypatch.setattr(project_field_service.project_write_repository, repository_function, _none)

    with pytest.raises(HTTPException) as exc_info:
        await use_case(None, 5, value)

    assert exc_info.value.status_code == 404

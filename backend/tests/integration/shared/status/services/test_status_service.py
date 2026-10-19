"""Unit tests for the Status service validation paths (no DB access)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.status.services import status_service

pytestmark = pytest.mark.integration


async def test_create_status_rejects_invalid_color_token_before_db_access() -> None:
    """An unknown colour token fails with 400 without touching the session."""
    with pytest.raises(HTTPException) as exc_info:
        await status_service.create_status(
            cast(AsyncSession, None),
            name="X",
            category="general",
            color_token="magenta",
            description=None,
            sort_order=0.0,
        )

    assert exc_info.value.status_code == 400


async def test_get_status_by_name_for_type_delegates_to_repository(monkeypatch: pytest.MonkeyPatch) -> None:
    """The service resolves a type-scoped status through the status repository."""
    captured: dict[str, Any] = {}
    expected = SimpleNamespace(id=7, name="active")

    async def _fake(_db: Any, name: str, statusable_type: str) -> Any:
        captured["args"] = (name, statusable_type)
        return expected

    monkeypatch.setattr(status_service.status_repository, "get_by_name_for_type", _fake)

    result = await status_service.get_status_by_name_for_type(None, "active", "fbf_job_role")

    assert result is expected
    assert captured["args"] == ("active", "fbf_job_role")

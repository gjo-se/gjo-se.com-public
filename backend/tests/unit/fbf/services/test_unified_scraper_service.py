"""Unit tests for ``unified_scraper_service`` (skip paths, no external I/O)."""

from __future__ import annotations

import contextlib
from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.fbf.repositories import project_repository
from app.fbf.services.unified_scraper_service import run_unified_scraper
from app.shared.credential_store.dependencies import credential_store_dependencies

pytestmark = pytest.mark.unit


@contextlib.asynccontextmanager
async def _fake_session() -> AsyncIterator[None]:
    """Yield ``None`` in place of a real DB session."""
    yield None


class _FakeCredentialService:
    """Credential service double returning no freelancermap credentials."""

    async def seed_from_registry(self, _db: Any) -> int:
        return 0

    async def get_credentials(self, _db: Any, *, service: str) -> dict[str, Any]:
        return {}

    async def get_by_service(self, _db: Any, *, service: str) -> Any:
        return None


class _ActiveNoCredentialService(_FakeCredentialService):
    """Credential service double with an active portal but no stored keys."""

    async def get_by_service(self, _db: Any, *, service: str) -> Any:
        return SimpleNamespace(service=service)


def _patch(monkeypatch: pytest.MonkeyPatch, service: _FakeCredentialService) -> None:
    monkeypatch.setattr(project_repository, "open_session", _fake_session)
    monkeypatch.setattr(credential_store_dependencies, "get_admin_credential_service", lambda: service)


@pytest.mark.asyncio
async def test_run_unified_scraper_skips_inactive_portal(monkeypatch: pytest.MonkeyPatch) -> None:
    """An inactive freelancermap portal short-circuits to ``skipped``."""
    _patch(monkeypatch, _FakeCredentialService())

    result = await run_unified_scraper(scraper_factory=MagicMock(), mapper=MagicMock())

    assert result == {"status": "done", "saved": 0, "skipped": ["freelancermap"]}


@pytest.mark.asyncio
async def test_run_unified_scraper_skips_without_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """An active portal without stored credentials skips with ``no_credentials``."""
    _patch(monkeypatch, _ActiveNoCredentialService())

    result = await run_unified_scraper(scraper_factory=MagicMock(), mapper=MagicMock())

    assert result == {"status": "done", "saved": 0, "skipped": ["freelancermap"], "reason": "no_credentials"}

"""Unit tests for the project-catalog port adapter."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.services import project_catalog_adapter
from app.fbf.services.project_catalog_adapter import ProjectCatalogAdapter

pytestmark = pytest.mark.unit


def _project() -> Any:
    """In-memory project with the fields the port projects."""
    return SimpleNamespace(
        id=1,
        title="Data Engineer",
        title_normalized="Data Engineer",
        url="https://x",
        description="desc",
        remote_percent=100,
        contract_type="freelance",
        start_date="01/2026",
        my_start_date=None,
        hourly_rate=90,
        my_hourly_rate=None,
        country="DE",
        canonical_id=None,
        company_name="ACME",
        contact_name="Jane",
        endcustomer=True,
    )


@pytest.mark.asyncio
async def test_get_project_maps_all_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """All projected fields are carried into ``ProjectRef``."""

    async def _by_id(_db: Any, _project_id: int) -> Any:
        return _project()

    monkeypatch.setattr(project_catalog_adapter.project_repository, "get_out_by_id", _by_id)

    result = await ProjectCatalogAdapter().get_project(None, 1)

    assert result is not None
    assert result.id == 1
    assert result.hourly_rate == 90


@pytest.mark.asyncio
async def test_get_project_none_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing project yields ``None``."""

    async def _by_id(_db: Any, _project_id: int) -> None:
        return None

    monkeypatch.setattr(project_catalog_adapter.project_repository, "get_out_by_id", _by_id)

    assert await ProjectCatalogAdapter().get_project(None, 999) is None


@pytest.mark.asyncio
async def test_get_contact_facts_projects_contact_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """Only the contact-enrichment fields are projected."""

    async def _by_id(_db: Any, _project_id: int) -> Any:
        return _project()

    monkeypatch.setattr(project_catalog_adapter.project_repository, "get_out_by_id", _by_id)

    result = await ProjectCatalogAdapter().get_contact_facts(None, 1)

    assert result is not None
    assert result.company_name == "ACME"
    assert result.contact_name == "Jane"
    assert result.endcustomer is True


@pytest.mark.asyncio
async def test_set_status_delegates_to_repository(monkeypatch: pytest.MonkeyPatch) -> None:
    """The status write is delegated to the repository."""
    seen: dict[str, Any] = {}

    async def _set_status(_db: Any, project_id: int, status: str) -> Any:
        seen.update(project_id=project_id, status=status)
        return SimpleNamespace()

    monkeypatch.setattr(project_catalog_adapter.project_repository, "set_status", _set_status)

    await ProjectCatalogAdapter().set_status(None, 7, "applied")

    assert seen == {"project_id": 7, "status": "applied"}


@pytest.mark.asyncio
async def test_get_freelancermap_external_id_returns_matching_id(monkeypatch: pytest.MonkeyPatch) -> None:
    """A matching raw entry yields its external id."""

    async def _by_url(_db: Any, _url: str) -> Any:
        return SimpleNamespace(external_id="ext-9")

    monkeypatch.setattr(project_catalog_adapter.project_freelancer_map_repository, "get_by_url", _by_url)

    result = await ProjectCatalogAdapter().get_freelancermap_external_id(None, "https://x")

    assert result == "ext-9"


@pytest.mark.asyncio
async def test_get_freelancermap_external_id_none_without_raw_entry(monkeypatch: pytest.MonkeyPatch) -> None:
    """No raw entry yields ``None``."""

    async def _by_url(_db: Any, _url: str) -> None:
        return None

    monkeypatch.setattr(project_catalog_adapter.project_freelancer_map_repository, "get_by_url", _by_url)

    assert await ProjectCatalogAdapter().get_freelancermap_external_id(None, "https://x") is None

"""Unit tests for the CRM contact onboarding adapter component.

The company enrichment and the CRM repositories are replaced by fakes at the
module boundary, so the address → person → project_person chain construction is
verified without a DB.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest

from app.crm.infrastructure.hunter_client import HunterClientFactory
from app.crm.schemas.address_schemas import AddressOut
from app.crm.schemas.person_schemas import PersonOut
from app.crm.schemas.project_person_schemas import ProjectPersonOut
from app.crm.services import contact_onboarding_adapter
from app.crm.services.contact_onboarding_adapter import CrmContactOnboarding

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def _factory() -> HunterClientFactory:
    """Return a placeholder hunter factory (unused by the patched enrich)."""
    return cast(HunterClientFactory, lambda *, api_key: None)


def _address_out(address_id: int) -> AddressOut:
    now = datetime.now(UTC)
    return AddressOut(id=address_id, crm_company_id=42, is_primary=True, created_at=now, updated_at=now)


def _person_out(person_id: int) -> PersonOut:
    now = datetime.now(UTC)
    return PersonOut(id=person_id, created_at=now, updated_at=now)


def _project_person_out(link_id: int) -> ProjectPersonOut:
    return ProjectPersonOut(
        id=link_id, project_id=1, crm_person_id=11, label="endcustomer_contact", created_at=datetime.now(UTC)
    )


async def test_create_endcustomer_contact_builds_the_contact_chain(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The onboarding chains address → person → junction and returns their ids."""
    monkeypatch.setattr(
        contact_onboarding_adapter,
        "enrich_company",
        AsyncMock(return_value=SimpleNamespace(id=42)),
    )
    address_create = AsyncMock(return_value=_address_out(10))
    person_create = AsyncMock(return_value=_person_out(11))
    project_person_create = AsyncMock(return_value=_project_person_out(12))
    monkeypatch.setattr(contact_onboarding_adapter.address_repository, "create", address_create)
    monkeypatch.setattr(contact_onboarding_adapter.person_repository, "create", person_create)
    monkeypatch.setattr(contact_onboarding_adapter.project_person_repository, "create", project_person_create)

    db = AsyncMock()
    adapter = CrmContactOnboarding(_factory())

    ref = await adapter.create_endcustomer_contact(db, project_id=1, company_name="Acme", domain=None)

    assert ref.company_id == 42
    assert ref.person_id == 11

    address_data = _second_arg(address_create)
    assert address_data.crm_company_id == 42
    assert address_data.label == "Hauptsitz"
    assert address_data.is_primary is True

    person_data = _second_arg(person_create)
    assert person_data.address_id == 10
    assert person_data.last_name == "Acme"

    link_data = _second_arg(project_person_create)
    assert link_data.project_id == 1
    assert link_data.crm_person_id == 11
    assert link_data.label == "endcustomer_contact"


def _second_arg(mock: AsyncMock) -> Any:
    """Return the second positional argument of the (single) awaited call."""
    return mock.await_args.args[1]

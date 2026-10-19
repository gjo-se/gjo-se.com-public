"""Unit tests for the shared CRM contact port."""

from __future__ import annotations

import dataclasses

import pytest

from app.shared.ports.crm_contact import (
    ContactBlockedError,
    CrmContactPort,
    PrimaryContactRef,
    get_crm_contact_port,
)

pytestmark = pytest.mark.unit


class _CrmPort:
    """Structural implementation of the CRM contact port."""

    async def list_primary_contacts(self, db: object, project_id: int) -> list[PrimaryContactRef]:
        """Return no contacts."""
        return []

    async def get_primary_contact_ids_for_projects(self, db: object, project_ids: object) -> dict[int, object]:
        """Return an empty id map."""
        return {}

    async def get_project_ids_for_person(self, db: object, crm_person_id: int) -> list[int]:
        """Return no project ids."""
        return []

    async def assert_person_not_blocked(self, db: object, person_id: int) -> None:
        """No-op."""
        return

    async def create_endcustomer_contact(
        self, db: object, *, project_id: int, company_name: str, domain: str | None
    ) -> object:
        """Return a placeholder reference."""
        return object()

    async def move_project_links(self, db: object, from_project_id: int, to_project_id: int) -> int:
        """Return the number of moved links."""
        return 0


def test_crm_port_fake_satisfies_protocol() -> None:
    """An object with the contract methods satisfies the runtime protocol."""
    assert isinstance(_CrmPort(), CrmContactPort)


def test_contact_blocked_error_formats_person_scope() -> None:
    """A person-scoped block message names the person scope."""
    error = ContactBlockedError(scope="person", reason="Bitte nicht kontaktieren")

    assert str(error) == "Kontaktsperre Person: Bitte nicht kontaktieren"
    assert error.scope == "person"


def test_contact_blocked_error_formats_company_scope_with_name() -> None:
    """A company-scoped block message includes the company name."""
    error = ContactBlockedError(scope="company", reason="Blacklist", name="ACME")

    assert str(error) == "Kontaktsperre Firma (ACME): Blacklist"
    assert error.name == "ACME"


def test_primary_contact_ref_is_frozen() -> None:
    """The contact projection is immutable."""
    ref = PrimaryContactRef(
        person_id=1,
        first_name="A",
        last_name="B",
        email=None,
        company_name=None,
        company_email=None,
    )

    with pytest.raises(dataclasses.FrozenInstanceError):
        ref.person_id = 2


async def test_get_crm_contact_port_returns_wired_port() -> None:
    """The composition root wires a concrete CRM contact port."""
    assert isinstance(await get_crm_contact_port(), CrmContactPort)

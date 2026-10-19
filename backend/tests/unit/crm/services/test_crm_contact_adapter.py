"""Unit tests for the CRM contact adapter facade (composed port implementation).

The facade composes four cohesive adapter components; this verifies that the
composition exposes the full :class:`CrmContactPort` surface. The individual
components are covered by their own mirror tests.
"""

from __future__ import annotations

from typing import cast

import pytest

from app.crm.infrastructure.hunter_client import HunterClientFactory
from app.crm.services.crm_contact_adapter import CrmContactAdapter, build_crm_contact_adapter
from app.shared.ports.crm_contact import CrmContactPort

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def _factory() -> HunterClientFactory:
    """Return a placeholder hunter factory (these tests never enrich)."""
    return cast(HunterClientFactory, lambda *, api_key: None)


def test_build_crm_contact_adapter_implements_the_port() -> None:
    """The factory returns an object satisfying the runtime-checkable port."""
    adapter = build_crm_contact_adapter(_factory())

    assert isinstance(adapter, CrmContactAdapter)
    assert isinstance(adapter, CrmContactPort)


def test_composed_adapter_exposes_every_port_operation() -> None:
    """All six port operations are present through the mixin composition."""
    adapter = CrmContactAdapter(_factory())

    for name in (
        "list_primary_contacts",
        "get_primary_contact_ids_for_projects",
        "get_project_ids_for_person",
        "assert_person_not_blocked",
        "create_endcustomer_contact",
        "move_project_links",
    ):
        assert callable(getattr(adapter, name))

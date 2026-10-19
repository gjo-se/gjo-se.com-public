"""Unit tests for the CRM contact queries adapter component.

The repositories are replaced by deterministic fakes at the module boundary, so
the label filtering, person→ref mapping, missing-row skip and empty
short-circuit are verified without a database.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.crm.schemas.person_schemas import PersonOut
from app.crm.services import contact_queries_adapter
from app.crm.services.contact_queries_adapter import CrmContactQueries

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def _queries() -> CrmContactQueries:
    """Build the queries component (stateless)."""
    return CrmContactQueries()


def _person_out(*, person_id: int, company_name: str | None = None, company_email: str | None = None) -> PersonOut:
    """Build a minimal person DTO stand-in returned by the repository."""
    now = datetime.now(UTC)
    return PersonOut(
        id=person_id,
        first_name="Gregory",
        last_name="Erdmann",
        email="g@example.test",
        primary_company_name=company_name,
        primary_company_email=company_email,
        created_at=now,
        updated_at=now,
    )


def _link(*, crm_person_id: int, label: str, project_id: int = 1) -> SimpleNamespace:
    """Build a minimal project↔person link stand-in."""
    return SimpleNamespace(crm_person_id=crm_person_id, label=label, project_id=project_id)


def _patch_links(monkeypatch: pytest.MonkeyPatch, links: list[SimpleNamespace]) -> None:
    monkeypatch.setattr(
        contact_queries_adapter.project_person_repository,
        "find_by_project",
        AsyncMock(return_value=links),
    )


def _patch_persons(monkeypatch: pytest.MonkeyPatch, by_id: dict[int, PersonOut | None]) -> None:
    async def _get(_db: object, person_id: int) -> PersonOut | None:
        return by_id.get(person_id)

    monkeypatch.setattr(contact_queries_adapter.person_repository, "get_by_id_with_company", _get)


async def test_list_primary_contacts_keeps_only_primary_label(monkeypatch: pytest.MonkeyPatch) -> None:
    """Only ``primary``-labelled links with a resolvable person become refs."""
    _patch_links(monkeypatch, [_link(crm_person_id=11, label="primary"), _link(crm_person_id=12, label="secondary")])
    _patch_persons(
        monkeypatch,
        {
            11: _person_out(person_id=11, company_name="Acme GmbH", company_email="info@acme.test"),
            12: _person_out(person_id=12),
        },
    )

    refs = await _queries().list_primary_contacts(AsyncMock(), project_id=1)

    assert len(refs) == 1
    assert refs[0].person_id == 11
    assert refs[0].first_name == "Gregory"
    assert refs[0].company_name == "Acme GmbH"


async def test_list_primary_contacts_selects_only_the_exact_primary_label(monkeypatch: pytest.MonkeyPatch) -> None:
    """Links with labels sorting before/after ``primary`` are filtered out, not kept."""
    _patch_links(
        monkeypatch,
        [
            _link(crm_person_id=1, label="aaa"),
            _link(crm_person_id=2, label="primary"),
            _link(crm_person_id=3, label="zzz"),
        ],
    )
    _patch_persons(
        monkeypatch,
        {
            1: _person_out(person_id=1),
            2: _person_out(person_id=2),
            3: _person_out(person_id=3),
        },
    )

    refs = await _queries().list_primary_contacts(AsyncMock(), project_id=1)

    assert [ref.person_id for ref in refs] == [2]


async def test_list_primary_contacts_matches_label_by_value_not_identity(monkeypatch: pytest.MonkeyPatch) -> None:
    """A label equal to ``primary`` but a distinct string instance still counts."""
    label = "".join(["pri", "mary"])
    _patch_links(monkeypatch, [_link(crm_person_id=2, label=label)])
    _patch_persons(monkeypatch, {2: _person_out(person_id=2)})

    refs = await _queries().list_primary_contacts(AsyncMock(), project_id=1)

    assert [ref.person_id for ref in refs] == [2]


async def test_list_primary_contacts_visits_all_links(monkeypatch: pytest.MonkeyPatch) -> None:
    """A non-primary link before the primary one must not stop the scan."""
    _patch_links(
        monkeypatch,
        [_link(crm_person_id=1, label="secondary"), _link(crm_person_id=2, label="primary")],
    )
    _patch_persons(monkeypatch, {1: _person_out(person_id=1), 2: _person_out(person_id=2)})

    refs = await _queries().list_primary_contacts(AsyncMock(), project_id=1)

    assert [ref.person_id for ref in refs] == [2]


async def test_list_primary_contacts_skips_link_without_person(monkeypatch: pytest.MonkeyPatch) -> None:
    """A primary link whose person cannot be resolved is skipped (not an error)."""
    _patch_links(monkeypatch, [_link(crm_person_id=99, label="primary")])
    _patch_persons(monkeypatch, {99: None})

    refs = await _queries().list_primary_contacts(AsyncMock(), project_id=1)

    assert refs == []


async def test_list_primary_contacts_continues_after_missing_person(monkeypatch: pytest.MonkeyPatch) -> None:
    """A primary link with a missing person must not stop a later valid link."""
    _patch_links(
        monkeypatch,
        [_link(crm_person_id=1, label="primary"), _link(crm_person_id=2, label="primary")],
    )
    _patch_persons(monkeypatch, {1: None, 2: _person_out(person_id=2)})

    refs = await _queries().list_primary_contacts(AsyncMock(), project_id=1)

    assert [ref.person_id for ref in refs] == [2]


async def test_get_project_ids_for_person_returns_linked_project_ids(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every project link of the person contributes its project id."""
    monkeypatch.setattr(
        contact_queries_adapter.project_person_repository,
        "find_by_person",
        AsyncMock(
            return_value=[
                _link(crm_person_id=7, label="primary", project_id=3),
                _link(crm_person_id=7, label="secondary", project_id=4),
            ]
        ),
    )

    project_ids = await _queries().get_project_ids_for_person(AsyncMock(), crm_person_id=7)

    assert project_ids == [3, 4]


async def test_get_primary_contact_ids_for_projects_empty_input_returns_empty() -> None:
    """An empty project list short-circuits to an empty mapping without a query."""
    result = await _queries().get_primary_contact_ids_for_projects(AsyncMock(), [])

    assert result == {}

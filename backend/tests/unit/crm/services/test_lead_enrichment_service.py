"""Unit tests for the lead-enrichment service (Hunter Lead Enrich by email).

The Hunter client is replaced by an in-memory double and the person repository is
patched, so the service-level orchestration (guard on email, delegation of the
field mapping to the repository, result signalling) is verified without a DB. The
fill-only field mapping itself is covered by the repository integration tests.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.crm.schemas.person_schemas import PersonOut
from app.crm.services import lead_enrichment_service

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Override the suite-wide schema bootstrap (unit test without DB)."""
    return


class _FakeHunterClient:
    """Hunter double returning a fixed Lead Enrich payload."""

    def __init__(self, result: dict[str, Any] | None) -> None:
        self._result = result

    async def enrich_lead(self, email: str) -> dict[str, Any] | None:
        return self._result


def _install_client(monkeypatch: pytest.MonkeyPatch, result: dict[str, Any] | None) -> None:
    """Replace HunterClient and ensure an API key is configured."""
    monkeypatch.setattr(lead_enrichment_service, "HunterClient", lambda *, api_key: _FakeHunterClient(result))
    monkeypatch.setattr(lead_enrichment_service.settings, "HUNTER_API_KEY", "test-key")


def _person(*, person_id: int = 1, email: str | None = None) -> PersonOut:
    """Build a minimal person DTO for the service input."""
    now = datetime.now(UTC)
    return PersonOut(id=person_id, email=email, created_at=now, updated_at=now)


async def test_enrich_person_by_email_delegates_mapping_to_repository(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A Lead Enrich hit is handed to the repository and its result returned."""
    payload = {
        "first_name": "Gregory",
        "last_name": "Erdmann",
        "position": "Architekt",
        "linkedin_url": "https://linkedin.test/greg",
        "phone_number": "+49",
    }
    _install_client(monkeypatch, payload)
    person = _person(person_id=7, email="greg@example.test")
    db = AsyncMock()
    apply = AsyncMock(return_value=True)
    monkeypatch.setattr(lead_enrichment_service.person_repository, "apply_lead_enrich_result", apply)

    enriched = await lead_enrichment_service.enrich_person_by_email(db, person)

    assert enriched is True
    apply.assert_awaited_once()
    db_arg, person_id, result = apply.await_args.args
    assert db_arg is db
    assert person_id == 7
    assert result == payload


async def test_enrich_person_by_email_without_email_is_noop(monkeypatch: pytest.MonkeyPatch) -> None:
    """A person without an email is never enriched and never touches the repo."""
    _install_client(monkeypatch, {"first_name": "X"})
    person = _person(email=None)
    apply = AsyncMock()
    monkeypatch.setattr(lead_enrichment_service.person_repository, "apply_lead_enrich_result", apply)

    enriched = await lead_enrichment_service.enrich_person_by_email(AsyncMock(), person)

    assert enriched is False
    apply.assert_not_awaited()


async def test_enrich_person_by_email_without_result_is_noop(monkeypatch: pytest.MonkeyPatch) -> None:
    """An empty Hunter result changes nothing and does not touch the repository."""
    _install_client(monkeypatch, None)
    person = _person(email="greg@example.test")
    apply = AsyncMock()
    monkeypatch.setattr(lead_enrichment_service.person_repository, "apply_lead_enrich_result", apply)

    enriched = await lead_enrichment_service.enrich_person_by_email(AsyncMock(), person)

    assert enriched is False
    apply.assert_not_awaited()

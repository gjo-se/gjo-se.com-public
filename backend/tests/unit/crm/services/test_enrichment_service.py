"""Unit-Tests fuer enrich_person – Weitergabe von Hunter-Fehlern.

Der HunterClient wird durch ein In-Memory-Double ersetzt; eine DB wird nur als
unbenutzter Double uebergeben (der Fehlerpfad beruehrt sie nicht).
"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.crm.infrastructure.hunter_client import HunterError
from app.crm.models.person import Person
from app.crm.services import enrichment_service

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Override des suite-weiten Schema-Bootstraps (Unit-Test ohne DB)."""
    return


class _FakeHunterClient:
    """Hunter double that returns no email and an optional handled error."""

    def __init__(self, *, error: HunterError | None) -> None:
        self._error = error

    @property
    def last_error(self) -> HunterError | None:
        return self._error

    async def find_email(self, first_name: str, last_name: str, domain: str) -> dict | None:
        return None


def _install_client(monkeypatch: pytest.MonkeyPatch, error: HunterError | None) -> None:
    """Replace HunterClient and make sure an API key is configured."""
    monkeypatch.setattr(
        enrichment_service,
        "HunterClient",
        lambda *, api_key: _FakeHunterClient(error=error),
    )
    monkeypatch.setattr(enrichment_service.settings, "HUNTER_API_KEY", "test-key")


def _person() -> Person:
    return Person(first_name="Gregory", last_name="Erdmann")


async def test_enrich_person_reports_hunter_error_via_callback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ein behandeltes Hunter-Problem wird an on_error gemeldet."""
    error = HunterError(
        code="insufficient_credits",
        status_code=429,
        detail="quota reached",
    )
    _install_client(monkeypatch, error)
    received: list[HunterError] = []

    await enrichment_service.enrich_person(
        AsyncMock(),
        _person(),
        "example.com",
        on_error=received.append,
    )

    assert received == [error]


async def test_enrich_person_does_not_report_when_no_result_without_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ein leerer Treffer ohne Hunter-Fehler loest keinen Callback aus."""
    _install_client(monkeypatch, None)
    received: list[HunterError] = []

    await enrichment_service.enrich_person(
        AsyncMock(),
        _person(),
        "example.com",
        on_error=received.append,
    )

    assert received == []


async def test_enrich_person_does_not_call_hunter_when_domain_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ohne Domain wird Hunter gar nicht erst aufgerufen – kein Fehler."""
    _install_client(monkeypatch, HunterError(code="insufficient_credits"))
    received: list[HunterError] = []

    await enrichment_service.enrich_person(
        AsyncMock(),
        _person(),
        "",
        on_error=received.append,
    )

    assert received == []

"""Unit-Tests fuer den HunterClient – Mapping von HTTP-Fehlern auf HunterError.

Die Tests ersetzen ``httpx.AsyncClient`` durch ein In-Memory-Double, damit kein
echter Netzwerkzugriff stattfindet. Geprueft wird das beobachtbare Verhalten:
``find_email`` liefert ``None`` und der Grund steht in ``last_error``.
"""

from __future__ import annotations

import httpx
import pytest

from app.crm.infrastructure import hunter_client
from app.crm.infrastructure.hunter_client import (
    HunterClient,
    HunterError,
)

pytestmark = pytest.mark.unit

_URL = "https://api.hunter.io/v2/email-finder"


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Override des suite-weiten Schema-Bootstraps (Unit-Test ohne DB)."""
    return


def _response(status_code: int, *, json_body: dict) -> httpx.Response:
    """Build an httpx.Response with an attached request for raise_for_status."""
    return httpx.Response(
        status_code,
        json=json_body,
        request=httpx.Request("GET", _URL),
    )


def _install_response(monkeypatch: pytest.MonkeyPatch, response: httpx.Response) -> None:
    """Patch httpx.AsyncClient so every GET returns the given response."""

    class _FakeAsyncClient:
        def __init__(self, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> _FakeAsyncClient:
            return self

        async def __aexit__(self, *_exc: object) -> bool:
            return False

        async def get(self, *_args: object, **_kwargs: object) -> httpx.Response:
            return response

    monkeypatch.setattr(hunter_client.httpx, "AsyncClient", _FakeAsyncClient)


async def test_find_email_when_quota_exhausted_sets_insufficient_credits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """HTTP 429 wird als 'insufficient_credits' mit Detail gemeldet."""
    _install_response(
        monkeypatch,
        _response(
            429,
            json_body={
                "errors": [
                    {
                        "id": "too_many_requests",
                        "code": 429,
                        "details": "You've reached the limit for the searches.",
                    }
                ]
            },
        ),
    )
    client = HunterClient(api_key="test-key")

    result = await client.find_email("Gregory", "Erdmann", "example.com")

    assert result is None
    assert client.last_error == HunterError(
        code="insufficient_credits",
        status_code=429,
        detail="You've reached the limit for the searches.",
    )


async def test_find_email_when_unauthorized_sets_unauthorized(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """HTTP 401 wird als 'unauthorized' gemeldet."""
    _install_response(
        monkeypatch,
        _response(401, json_body={"errors": [{"details": "wrong api key"}]}),
    )
    client = HunterClient(api_key="bad-key")

    await client.find_email("Gregory", "Erdmann", "example.com")

    assert client.last_error is not None
    assert client.last_error.code == "unauthorized"
    assert client.last_error.status_code == 401


async def test_find_email_when_no_result_leaves_last_error_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ein leerer Treffer (HTTP 200 ohne E-Mail) ist kein Fehler."""
    _install_response(
        monkeypatch,
        _response(200, json_body={"data": {"email": None}}),
    )
    client = HunterClient(api_key="test-key")

    result = await client.find_email("Gregory", "Erdmann", "example.com")

    assert result is None
    assert client.last_error is None

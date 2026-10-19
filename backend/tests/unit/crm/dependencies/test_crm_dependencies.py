"""Unit tests for the crm composition-root providers.

Verifies that ``get_hunter_client`` wires a :class:`HunterClient` with the
given API key so the CRM services receive a client that sends that exact key
on its outbound request. The HTTP transport is replaced by a recording double –
no real network call happens.
"""

from __future__ import annotations

import httpx
import pytest

from app.crm.dependencies.crm_dependencies import get_hunter_client
from app.crm.infrastructure import hunter_client
from app.crm.infrastructure.hunter_client import HunterClient

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


class _RecordingAsyncClient:
    """Minimal httpx.AsyncClient double that records the last request params."""

    captured: dict[str, object] = {}

    def __init__(self, **_kwargs: object) -> None:
        pass

    async def __aenter__(self) -> _RecordingAsyncClient:
        return self

    async def __aexit__(self, *_exc: object) -> bool:
        return False

    async def get(self, url: str, params: dict[str, str] | None = None) -> httpx.Response:
        type(self).captured = {"url": url, "params": params}
        return httpx.Response(
            200,
            json={"data": {"email": "person@example.test", "score": 90}},
            request=httpx.Request("GET", url),
        )


def test_get_hunter_client_returns_hunter_client() -> None:
    """The provider returns a configured, error-free HunterClient."""
    client = get_hunter_client(api_key="wiring-key")  # pragma: allowlist secret

    assert isinstance(client, HunterClient)
    assert client.last_error is None


async def test_get_hunter_client_forwards_configured_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """The configured key is the api_key sent on the request."""
    monkeypatch.setattr(hunter_client.httpx, "AsyncClient", _RecordingAsyncClient)
    client = get_hunter_client(api_key="wiring-key")  # pragma: allowlist secret

    await client.find_email("Gregory", "Erdmann", "example.test")

    captured_params = _RecordingAsyncClient.captured["params"]
    assert isinstance(captured_params, dict)
    assert captured_params["api_key"] == "wiring-key"  # pragma: allowlist secret

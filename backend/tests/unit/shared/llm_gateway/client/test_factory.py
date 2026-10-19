"""Unit tests for the LLMClient construction helpers (``from_db`` / ``_create``)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.shared.llm_gateway.client.client import LLMClient
from app.shared.llm_gateway.dependencies import llm_gateway_dependencies as deps
from app.shared.llm_gateway.exceptions import LLMModelDisabledError

pytestmark = pytest.mark.unit


class _ModelService:
    """Fake model service recording the model id passed to ``assert_model_active``."""

    def __init__(self) -> None:
        self.model_ids: list[int] = []

    async def assert_model_active(self, _db: object, model_id: int) -> None:
        self.model_ids.append(model_id)


class _KeyService:
    """Fake user-key service recording the (user, provider) lookup."""

    def __init__(self, key: str | None = "sk-loaded-key") -> None:  # pragma: allowlist secret
        self.calls: list[tuple[int, int]] = []
        self._key = key

    async def get_key(self, _db: object, user_id: int, provider_id: int) -> str | None:
        self.calls.append((user_id, provider_id))
        return self._key


class _Db:
    """Async session stand-in returning a fixed model row and capturing the query."""

    def __init__(self, row: object, sql_sink: dict[str, str] | None = None) -> None:
        self._row = row
        self._sql_sink = sql_sink

    async def scalar(self, statement: Any) -> object:
        if self._sql_sink is not None:
            self._sql_sink["sql"] = str(statement.compile(compile_kwargs={"literal_binds": True}))
        return self._row


def _patch_services(monkeypatch: pytest.MonkeyPatch, model_service: _ModelService, key_service: _KeyService) -> None:
    monkeypatch.setattr(deps, "get_llm_model_service", lambda: model_service)
    monkeypatch.setattr(deps, "get_user_api_key_service", lambda: key_service)


def test_create_builds_an_llm_client() -> None:
    """The test-only factory yields a configured LLMClient instance."""
    client = LLMClient._create("gpt-4o-mini", "sk-test")  # pragma: allowlist secret

    assert isinstance(client, LLMClient)


async def test_from_db_builds_a_client_and_loads_the_user_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """A found, active model yields a client and triggers the user-key lookup."""
    model_service = _ModelService()
    key_service = _KeyService()
    _patch_services(monkeypatch, model_service, key_service)
    row = SimpleNamespace(id=5, provider_id=2, native_model_id="openai/gpt-4o-mini")

    client = await LLMClient.from_db(_Db(row), user_id=9, openrouter_id="openai/gpt-4o-mini")

    assert isinstance(client, LLMClient)
    assert model_service.model_ids == [5]
    assert key_service.calls == [(9, 2)]


async def test_from_db_filters_the_model_by_exact_openrouter_id(monkeypatch: pytest.MonkeyPatch) -> None:
    """The lookup filters on equality – never on an ordering or identity comparison."""
    sql_sink: dict[str, str] = {}
    _patch_services(monkeypatch, _ModelService(), _KeyService())
    row = SimpleNamespace(id=5, provider_id=2, native_model_id="openai/gpt-4o-mini")

    await LLMClient.from_db(_Db(row, sql_sink), user_id=9, openrouter_id="openai/gpt-4o-mini")

    sql = sql_sink["sql"].upper()
    assert "=" in sql
    assert not any(marker in sql for marker in ("<", ">", "!=", " IS ", " IS NOT "))


async def test_from_db_uses_minus_one_sentinel_and_raises_when_model_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An unknown model asserts the ``-1`` sentinel is inactive and then raises."""
    model_service = _ModelService()
    _patch_services(monkeypatch, model_service, _KeyService())

    with pytest.raises(LLMModelDisabledError):
        await LLMClient.from_db(_Db(None), user_id=9, openrouter_id="missing/model")

    assert model_service.model_ids == [-1]

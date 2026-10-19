"""Unit test for the scheduled LLM call-log purge job wrapper."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.shared.llm_gateway.jobs.llm_call_log_purge_job import purge_llm_call_logs

pytestmark = pytest.mark.integration


class _SessionContext:
    """Async context manager double yielding a sentinel session."""

    def __init__(self, session: object) -> None:
        self._session = session

    async def __aenter__(self) -> object:
        return self._session

    async def __aexit__(self, *exc: Any) -> bool:
        return False


async def test_purge_llm_call_logs_delegates_to_the_service(monkeypatch: pytest.MonkeyPatch) -> None:
    """The job runs the call-log purge on a fresh session."""
    session = object()
    service = SimpleNamespace(purge_older_than=AsyncMock(return_value=1))
    monkeypatch.setattr(
        "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_llm_call_log_service",
        lambda: service,
    )
    monkeypatch.setattr("app.shared.db_access.session.AsyncSessionLocal", lambda: _SessionContext(session))

    await purge_llm_call_logs()

    service.purge_older_than.assert_awaited_once_with(session)

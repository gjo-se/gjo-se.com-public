"""Unit tests for the LangFuse client singleton health gate.

Covers:
- Concurrent first calls report a consistent health status — no caller may
  observe the ``_healthy`` default and raise a false ``langfuse_unreachable``
  while the initial probe is still running.
- The cached health result is re-probed after its TTL, so a temporary outage
  recovers without a backend restart.

Each test runs against an isolated fresh copy of the module (clean singleton
state) and fakes only the system boundaries: ``langfuse.get_client`` (client
creation), ``httpx.get`` (health probe) and the module clock (TTL). No private
internal is patched.
"""

from __future__ import annotations

import importlib.util
import threading
from pathlib import Path
from typing import Any

import httpx
import pytest

from app.shared.config.config import settings
from app.shared.llm_gateway import langfuse_client as langfuse_client_module


class _FakeLangfuseClient:
    """Boundary double for the LangFuse client (truthy, otherwise inert)."""


class _HealthyResponse:
    """httpx response double reporting success."""

    def raise_for_status(self) -> None:
        """No-op – the fake probe is always healthy."""


class _UnhealthyResponse:
    """httpx response double reporting an unreachable LangFuse."""

    def raise_for_status(self) -> None:
        """Raise a connection error as an unreachable LangFuse would."""
        raise httpx.ConnectError("langfuse unreachable")


class _FakeClock:
    """Manually advanced monotonic clock."""

    def __init__(self, start: float = 0.0) -> None:
        self._now = start

    def monotonic(self) -> float:
        """Return the current fake time."""
        return self._now

    def advance(self, seconds: float) -> None:
        """Move the clock forward by *seconds*."""
        self._now += seconds


def _load_fresh_module() -> Any:
    """Load an isolated copy of the module to obtain a clean singleton state."""
    path = Path(langfuse_client_module.__file__)
    spec = importlib.util.spec_from_file_location("langfuse_client_under_test", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def client_module(monkeypatch: pytest.MonkeyPatch) -> Any:
    """Provide a fresh, configured LangFuse client module per test.

    The real singleton module stays untouched; LangFuse is marked configured
    via public settings and client creation is faked at the LangChain boundary.
    """
    monkeypatch.setattr(settings, "LANGFUSE_HOST", "http://langfuse.test")
    monkeypatch.setattr(settings, "LANGFUSE_PUBLIC_KEY", "pk-langfuse-test")  # pragma: allowlist secret
    monkeypatch.setattr("langfuse.get_client", _FakeLangfuseClient)
    return _load_fresh_module()


class TestConcurrentInitialisation:
    @pytest.mark.unit
    def test_concurrent_first_calls_report_same_health_status(
        self, client_module: Any, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """All concurrent first callers observe LangFuse as healthy, probing once."""
        barrier = threading.Barrier(17)
        probe_entered = threading.Event()
        release_probe = threading.Event()
        probe_calls = 0
        probe_lock = threading.Lock()

        def fake_get(*_args: Any, **_kwargs: Any) -> _HealthyResponse:
            nonlocal probe_calls
            with probe_lock:
                probe_calls += 1
            probe_entered.set()
            assert release_probe.wait(timeout=5)
            return _HealthyResponse()

        monkeypatch.setattr(client_module.httpx, "get", fake_get)

        results: list[bool] = []
        results_lock = threading.Lock()

        def call() -> None:
            barrier.wait(timeout=5)
            client_module.get_langfuse_client()
            with results_lock:
                results.append(client_module.is_langfuse_healthy())

        threads = [threading.Thread(target=call) for _ in range(16)]
        for thread in threads:
            thread.start()
        barrier.wait(timeout=5)
        assert probe_entered.wait(timeout=5)
        release_probe.set()
        for thread in threads:
            thread.join(timeout=5)

        assert results == [True] * 16
        assert probe_calls == 1


class TestHealthRecovery:
    @pytest.mark.unit
    def test_health_recovers_after_ttl_without_reinitialisation(
        self, client_module: Any, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A stale unhealthy result is re-probed after the TTL and recovers to healthy."""
        clock = _FakeClock()
        probe_results = iter([_UnhealthyResponse(), _HealthyResponse()])

        def fake_get(*_args: Any, **_kwargs: Any) -> Any:
            return next(probe_results)

        monkeypatch.setattr(client_module, "time", clock)
        monkeypatch.setattr(client_module.httpx, "get", fake_get)

        client_module.get_langfuse_client()
        assert client_module.is_langfuse_healthy() is False

        clock.advance(31.0)
        client_module.get_langfuse_client()

        assert client_module.is_langfuse_healthy() is True

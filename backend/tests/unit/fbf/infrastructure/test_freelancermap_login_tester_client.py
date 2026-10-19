"""Unit tests for the freelancermap Playwright login tester (success/auth error)."""

from __future__ import annotations

from typing import Any

import pytest

from app.fbf.infrastructure import freelancermap_auth_client, freelancermap_login_tester_client

pytestmark = pytest.mark.unit


@pytest.mark.asyncio
async def test_successful_login_reports_true(monkeypatch: pytest.MonkeyPatch) -> None:
    """A successful Playwright login returns ``True``."""

    async def _login(_username: str, _password: str, _path: str) -> None:
        return None

    monkeypatch.setattr(freelancermap_auth_client, "login_and_save_state", _login)

    assert await freelancermap_login_tester_client.test_freelancermap_login("u", "p") is True


@pytest.mark.asyncio
async def test_auth_error_reports_false(monkeypatch: pytest.MonkeyPatch) -> None:
    """A Playwright auth error is swallowed and reported as ``False``."""

    class _AuthError(Exception):
        pass

    async def _login(_username: str, _password: str, _path: str) -> Any:
        raise _AuthError

    monkeypatch.setattr(freelancermap_auth_client, "FreelancermapAuthError", _AuthError)
    monkeypatch.setattr(freelancermap_auth_client, "login_and_save_state", _login)

    assert await freelancermap_login_tester_client.test_freelancermap_login("u", "bad") is False

"""Unit tests for the signed contact-form token helpers (no DB).

Covers the issue/verify contract: signature + scope + expiry + the server-side
minimum-age time-trap. The clock is frozen so the min-age/expiry boundaries are
deterministic; the secret comes from the shared test settings.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest

from app.contact.services import contact_token_service
from app.shared.config.config import settings

pytestmark = pytest.mark.unit

_ALGORITHM = "HS256"
_SCOPE = "contact_form"
_T0 = datetime(2026, 1, 1, tzinfo=UTC)


def _craft_token(*, scope: str | None = _SCOPE, issued_offset_seconds: int | None = 0, ttl_minutes: int = 15) -> str:
    """Build a signed token with controllable scope and ``iat`` presence."""
    now = _T0
    claims: dict[str, Any] = {
        "scope": scope,
        "exp": int((now + timedelta(minutes=ttl_minutes)).timestamp()),
    }
    if issued_offset_seconds is not None:
        claims["iat"] = int((now + timedelta(seconds=issued_offset_seconds)).timestamp())
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=_ALGORITHM)


def test_issue_token_returns_signed_token_with_future_expiry(frozen_time: Any) -> None:
    """A freshly issued token carries a future expiry timestamp."""
    with frozen_time(_T0):
        token, expires_at = contact_token_service.issue_token()

    assert isinstance(token, str)
    assert expires_at > _T0


def test_verify_token_accepts_token_after_min_age(frozen_time: Any) -> None:
    """A correctly signed token past the min-age window is accepted."""
    with frozen_time(_T0):
        token, _ = contact_token_service.issue_token()

    with frozen_time(_T0 + timedelta(seconds=3)):
        assert contact_token_service.verify_token(token) is True


def test_verify_token_rejects_token_younger_than_min_age(frozen_time: Any) -> None:
    """A token submitted within the time-trap window is treated as spam."""
    with frozen_time(_T0):
        token, _ = contact_token_service.issue_token()

    with frozen_time(_T0 + timedelta(seconds=1)):
        assert contact_token_service.verify_token(token) is False


def test_verify_token_rejects_expired_token(frozen_time: Any) -> None:
    """A token past its TTL is rejected by signature validation."""
    with frozen_time(_T0):
        token, _ = contact_token_service.issue_token()

    with frozen_time(_T0 + timedelta(minutes=16)):
        assert contact_token_service.verify_token(token) is False


def test_verify_token_rejects_token_with_wrong_scope(frozen_time: Any) -> None:
    """A signed token bound to another scope is not accepted."""
    token = _craft_token(scope="password_reset")

    with frozen_time(_T0 + timedelta(seconds=3)):
        assert contact_token_service.verify_token(token) is False


def test_verify_token_rejects_token_without_issued_at(frozen_time: Any) -> None:
    """A token without a valid ``iat`` claim fails the min-age check."""
    token = _craft_token(issued_offset_seconds=None)

    with frozen_time(_T0 + timedelta(seconds=3)):
        assert contact_token_service.verify_token(token) is False


def test_verify_token_rejects_tampered_signature(frozen_time: Any) -> None:
    """A token with a broken signature is rejected."""
    with frozen_time(_T0):
        token, _ = contact_token_service.issue_token()

    with frozen_time(_T0 + timedelta(seconds=3)):
        assert contact_token_service.verify_token(token + "tampered") is False

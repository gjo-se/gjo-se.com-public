"""Signed contact-form token service (gjo_se_com).

Issues and verifies short-lived, server-signed tokens (HS256 via
``settings.SECRET_KEY``) that prove a submission originated from the SPA that
actually loaded the form. A raw-JSON bot cannot forge the signature, so a
missing/invalid token lets ``POST /api/v1/contact`` silently drop the payload.

Design notes:
- No separate secret: the existing ``SECRET_KEY`` is reused (no secret in FE).
- No single-use/replay store: reuse within the TTL is deliberately accepted.
- Min-age: ``iat`` is set server-side, so a submission younger than
  ``_TOKEN_MIN_AGE_SECONDS`` after issuing is treated as spam – this replaces
  the former (client-forgeable) ``started_at`` time-trap.
"""

from datetime import UTC, datetime, timedelta

import jwt
import structlog

from app.shared.config.config import settings

logger = structlog.get_logger(__name__)

#: Token lifetime in minutes – long enough for a form to be filled in.
_TOKEN_TTL_MINUTES = 15

#: Minimum seconds between token issue and submit (server-side time-trap).
_TOKEN_MIN_AGE_SECONDS = 2.0

#: Scope claim that binds the token to the contact form.
_TOKEN_SCOPE = "contact_form"

#: Signing algorithm – must match the verification side.
_ALGORITHM = "HS256"


def issue_token() -> tuple[str, datetime]:
    """Issue a signed contact-form token.

    Returns:
        Tuple of the signed JWT and its expiry timestamp (timezone-aware UTC).
    """
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=_TOKEN_TTL_MINUTES)
    claims = {
        "scope": _TOKEN_SCOPE,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(claims, settings.SECRET_KEY, algorithm=_ALGORITHM)
    return token, expires_at


def verify_token(token: str) -> bool:
    """Verify a contact-form token's signature, scope, expiry and min-age.

    Args:
        token: The signed JWT supplied by the client.

    Returns:
        True when the token is valid, in scope and older than
        ``_TOKEN_MIN_AGE_SECONDS``; False otherwise (expiry is enforced by
        ``jwt.decode``). The token value is never logged.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:
        logger.warning("contact: token verification failed", exc_info=True)
        return False

    if payload.get("scope") != _TOKEN_SCOPE:
        logger.warning("contact: token scope mismatch")
        return False

    issued_at = payload.get("iat")
    if not isinstance(issued_at, int):
        logger.warning("contact: token missing valid iat")
        return False

    age_seconds = datetime.now(UTC).timestamp() - issued_at
    if age_seconds < _TOKEN_MIN_AGE_SECONDS:
        logger.warning("contact: token too young – drop submission")
        return False

    return True

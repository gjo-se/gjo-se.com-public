"""Shared helper functions for aiscope module tests."""

from __future__ import annotations

from httpx import AsyncClient

from app.identity.repositories import user_repository as user_repo
from app.main import app
from app.shared.db_access.session import get_db
from app.shared.security.infrastructure.auth_security_client import create_access_token

AUTH_BASE = "/api/v1/public/auth"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_admin(client: AsyncClient, email: str = "admin@example.com") -> str:
    """Registriert und aktiviert einen Admin-User; gibt JWT-Token zurück."""
    await client.post(
        f"{AUTH_BASE}/register",
        json={
            "email": email,
            "name": "Admin",
            "password": "adminpass123",  # pragma: allowlist secret
        },
    )
    db_override = app.dependency_overrides.get(get_db)
    assert db_override is not None
    token: str = ""
    async for db in db_override():
        user = await user_repo.get_by_email(db, email)
        assert user is not None
        user.is_active = True
        user.role = "admin"
        await db.commit()
        await db.refresh(user)
        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        break
    assert token, "Token konnte nicht erstellt werden"
    return token


async def _create_user_token(client: AsyncClient, email: str = "user@example.com") -> str:
    """Registriert einen normalen User; gibt JWT-Token zurück."""
    await client.post(
        f"{AUTH_BASE}/register",
        json={
            "email": email,
            "name": "User",
            "password": "userpass123",  # pragma: allowlist secret
        },
    )
    db_override = app.dependency_overrides.get(get_db)
    assert db_override is not None
    token: str = ""
    async for db in db_override():
        user = await user_repo.get_by_email(db, email)
        assert user is not None
        user.is_active = True
        await db.commit()
        await db.refresh(user)
        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
        break
    assert token, "Token konnte nicht erstellt werden"
    return token

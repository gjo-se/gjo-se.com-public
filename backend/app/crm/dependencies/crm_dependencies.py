"""Composition-root providers for the crm bounded context."""

from __future__ import annotations

from app.crm.infrastructure.hunter_client import HunterClient


def get_hunter_client(api_key: str) -> HunterClient:
    """Provide a wired :class:`HunterClient` for the given Hunter.io API key."""
    return HunterClient(api_key=api_key)

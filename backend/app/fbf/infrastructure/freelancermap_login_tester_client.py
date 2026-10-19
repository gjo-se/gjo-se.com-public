"""Playwright-backed freelancermap login tester (fbf integration credentials).

Owns the freelancermap-specific credential probe: it performs a real Playwright
login against freelancermap.de and reports whether the given credentials are
valid. It is imported by the fbf integration-login registry; the Playwright
client itself is imported lazily so importing this module does not pull
Playwright into the always-on API process.
"""

from __future__ import annotations

import asyncio
import tempfile


def _create_temp_state_path() -> str:
    """Create a unique temp-file path for the Playwright login state.

    ``tempfile.NamedTemporaryFile`` is synchronous I/O and must not run on the
    event loop – callers offload this helper via ``asyncio.to_thread``. The file
    is created and immediately closed; only its unique path is used.

    Returns:
        Path of the (removed) temp file to hand to ``login_and_save_state``.
    """
    with tempfile.NamedTemporaryFile(suffix=".json", delete=True) as tmp:
        return tmp.name


async def test_freelancermap_login(username: str, password: str) -> bool:
    """Perform a real Playwright login against freelancermap.de.

    Args:
        username: freelancermap login name.
        password: freelancermap login password.

    Returns:
        ``True`` on a successful login, ``False`` on an authentication error.
    """
    from app.fbf.infrastructure.freelancermap_auth_client import (
        FreelancermapAuthError,
        login_and_save_state,
    )

    tmp_path = await asyncio.to_thread(_create_temp_state_path)

    try:
        await login_and_save_state(username, password, tmp_path)
        return True
    except FreelancermapAuthError:
        return False

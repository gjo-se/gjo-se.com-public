"""fbf-owned integration login testers for admin credential validation.

Wired into the shared credential-store router at the composition root so the
shared layer never imports a bounded context (import-linter Achse 1).

The service-specific Playwright logins live in their own modules (see
:mod:`app.fbf.infrastructure.freelancermap_login_tester_client`); this module only
keeps the registry that maps a service key to its tester.
"""

from __future__ import annotations

from app.fbf.infrastructure.freelancermap_login_tester_client import test_freelancermap_login
from app.shared.credential_store.dependencies.credential_store_dependencies import (
    IntegrationLoginTester,
)

_LOGIN_TESTERS: dict[str, IntegrationLoginTester] = {
    "freelancermap": test_freelancermap_login,
}


def build_integration_login_tester(service: str) -> IntegrationLoginTester | None:
    """Return the login tester for *service*, or ``None`` when unknown.

    Args:
        service: Integration service key (e.g. ``"freelancermap"``).

    Returns:
        The async login tester callback, or ``None`` when no tester is registered.
    """
    return _LOGIN_TESTERS.get(service)

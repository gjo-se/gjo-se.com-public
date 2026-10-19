"""Shared-owned CRM contact port (import-linter Group G + H).

The application context snapshots a project's primary CRM contact (recipient
name/e-mail) and checks contact blocks before sending. The fbf context onboards
an endcustomer company as a project contact, re-points CRM links on a master
switch and creates the endcustomer contact chain. The CRM entities,
repositories and services are owned by ``app.crm``; the ``independence``
contract forbids ``app.application``/``app.fbf`` importing any of them directly.

Both contexts therefore depend on the :class:`CrmContactPort` protocol only. The
CRM context provides the concrete implementation; it is wired at the composition
root (``app/main.py``) via ``register_crm_contact_port``.

The :class:`ContactBlockedError` participates in the port contract (the
application router maps it to HTTP 409), so it lives next to the port instead of
inside the CRM context – the application never imports ``app.crm.exceptions``.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


class ContactBlockedError(Exception):
    """Raised when a person or its canonical company is contact-blocked.

    Attributes:
        scope: ``person`` or ``company``.
        reason: Human-readable reason for the block.
        name: Company name (only set for ``scope="company"``).
    """

    def __init__(self, *, scope: str, reason: str, name: str | None = None) -> None:
        label = f"Firma ({name})" if scope == "company" else "Person"
        message = f"Kontaktsperre {label}: {reason}"
        self.scope = scope
        self.reason = reason
        self.name = name
        super().__init__(message)


@dataclass(frozen=True, slots=True)
class PrimaryContactRef:
    """A project's ``primary`` contact with its resolved company facts.

    Carries only the fields the application side consumes (recipient display
    name, personal e-mail, fallback company e-mail and company name) – the port
    is the owner-published contract, not a mirror of the CRM entity.
    """

    person_id: int
    first_name: str | None
    last_name: str | None
    email: str | None
    company_name: str | None
    company_email: str | None


@dataclass(frozen=True, slots=True)
class ContactIds:
    """Resolved CRM ids of a project's ``primary`` contact (each may be ``None``)."""

    person_id: int | None
    company_id: int | None


@dataclass(frozen=True, slots=True)
class EndcustomerContactRef:
    """CRM ids created when onboarding an endcustomer as a project contact."""

    company_id: int
    person_id: int


@runtime_checkable
class CrmContactPort(Protocol):
    """CRM contact operations the application and fbf contexts need from ``app.crm``."""

    async def list_primary_contacts(self, db: AsyncSession, project_id: int) -> list[PrimaryContactRef]:
        """Return every ``primary``-labelled contact of a project (0, 1 or more)."""
        ...

    async def get_primary_contact_ids_for_projects(
        self, db: AsyncSession, project_ids: Sequence[int]
    ) -> dict[int, ContactIds]:
        """Return ``project_id -> ContactIds`` for the projects' primary contacts."""
        ...

    async def get_project_ids_for_person(self, db: AsyncSession, crm_person_id: int) -> list[int]:
        """Return the ids of projects linked to a CRM person (any label)."""
        ...

    async def assert_person_not_blocked(self, db: AsyncSession, person_id: int) -> None:
        """Assert that the person (and its canonical company) is not contact-blocked.

        Unknown persons are a silent no-op.

        Raises:
            ContactBlockedError: If the person or its company is blocked.
        """
        ...

    async def create_endcustomer_contact(
        self,
        db: AsyncSession,
        *,
        project_id: int,
        company_name: str,
        domain: str | None,
    ) -> EndcustomerContactRef:
        """Onboard an endcustomer company as a project contact.

        Find-or-creates the CRM company (with enrichment) and creates the
        address → person → ``project_crm_person`` chain for the given project.

        The caller owns the transaction and must commit.

        Args:
            db: Database session.
            project_id: Project the contact is linked to.
            company_name: Endcustomer company name.
            domain: Optional company domain.

        Returns:
            The created company and person ids.
        """
        ...

    async def move_project_links(self, db: AsyncSession, from_project_id: int, to_project_id: int) -> int:
        """Re-point all CRM person links from one project to another.

        The caller owns the transaction and must commit.

        Args:
            db: Database session.
            from_project_id: Project the links currently belong to.
            to_project_id: Project the links are moved to.

        Returns:
            Number of links re-pointed to ``to_project_id``.
        """
        ...


_PORT: dict[str, CrmContactPort] = {}


def register_crm_contact_port(port: CrmContactPort) -> None:
    """Register the concrete CRM contact port (composition root).

    Called once from ``app/main.py``. Enables direct (non-HTTP) resolution of the
    port, e.g. from services invoked without a FastAPI request.
    """
    _PORT["instance"] = port


async def get_crm_contact_port() -> CrmContactPort:
    """Resolve the CRM contact port.

    The concrete implementation lives in the CRM context and is registered at
    the composition root (``app/main.py``). Without that wiring the port fails
    closed.

    Returns:
        The wired CRM contact port.

    Raises:
        HTTPException 503: The CRM contact port is not wired.
    """
    port = _PORT.get("instance")
    if port is not None:
        return port
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="CRM contact port is not wired",
    )

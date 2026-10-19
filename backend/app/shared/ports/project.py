"""Shared-owned project-catalog port (import-linter Groups F + I).

``app.application`` and ``app.crm`` must not import the ``app.fbf``
project/skill internals (models, repositories, services) – the
``independence`` contract forbids any direct import between bounded
contexts. Where those contexts need project data (CV, mail, score,
submission snapshots, CRM contact enrichment), they depend on the
:class:`ProjectCatalogPort` protocol instead of importing ``app.fbf``.

The fbf context provides the concrete implementation; it is wired at the
composition root (``app/main.py``) via ``app.dependency_overrides``.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from fastapi import HTTPException, status
from sqlalchemy import Select
from sqlalchemy.ext.asyncio import AsyncSession

#: Published type of the opaque ``(project_id, title, title_normalized)``
#: selectable handed out through the port. Concrete providers import this alias
#: instead of ``sqlalchemy`` directly, so the fbf service layer stays free of
#: query imports (Achse 2, K1).
ProjectTitleSelect = Select[Any]


@dataclass(frozen=True, slots=True)
class ProjectRef:
    """Project facts the application context reads through the port.

    Only the fields the application side actually consumes are carried – the
    port is the owner-published contract, not a mirror of the fbf entity.
    """

    id: int
    title: str
    title_normalized: str | None
    url: str
    description: str | None
    remote_percent: int | None
    contract_type: str | None
    start_date: str | None
    my_start_date: str | None
    hourly_rate: int | None
    my_hourly_rate: int | None
    country: str | None
    canonical_id: int | None


@dataclass(frozen=True, slots=True)
class ProjectContactFacts:
    """Project facts the crm context reads for contact enrichment.

    Narrow projection: the crm enrichment flow only needs the company/contact
    name to find-or-create CRM entities and the ``endcustomer`` flag to derive
    the company kind.
    """

    company_name: str | None
    contact_name: str | None
    endcustomer: bool | None


@dataclass(frozen=True, slots=True)
class ProjectTitle:
    """Minimal project title projection for list/detail serialization."""

    title: str
    title_normalized: str | None


@runtime_checkable
class ProjectCatalogPort(Protocol):
    """Read/mutate operations consuming contexts need from ``app.fbf``."""

    async def get_project(self, db: AsyncSession, project_id: int) -> ProjectRef | None:
        """Return the project facts for ``project_id`` or ``None``."""
        ...

    async def get_contact_facts(self, db: AsyncSession, project_id: int) -> ProjectContactFacts | None:
        """Return the contact-enrichment facts for ``project_id`` or ``None``."""
        ...

    async def get_titles(self, db: AsyncSession, project_ids: Sequence[int]) -> dict[int, ProjectTitle]:
        """Return a ``project_id -> title`` projection for the given ids."""
        ...

    async def get_freelancermap_external_id(self, db: AsyncSession, url: str) -> str | None:
        """Return the raw freelancermap external id matched by ``url``, or ``None``."""
        ...

    async def set_status(self, db: AsyncSession, project_id: int, status: str) -> None:
        """Set the exclusive project status via ``core_statusable``."""
        ...

    def project_title_select(self) -> ProjectTitleSelect:
        """Return a ``(project_id, title, title_normalized)`` selectable.

        The application repository uses it opaquely to search/sort submissions by
        project title without importing the fbf model or mirroring its table.
        """
        ...


_PORT: dict[str, ProjectCatalogPort] = {}


def register_project_catalog_port(port: ProjectCatalogPort) -> None:
    """Register the concrete project-catalog port (composition root).

    Called once from ``app/main.py``. Enables direct (non-HTTP) resolution of the
    port, e.g. from services invoked without a FastAPI request.
    """
    _PORT["instance"] = port


async def get_project_catalog_port() -> ProjectCatalogPort:
    """Resolve the project-catalog port.

    The concrete implementation lives in the fbf context and is registered at
    the composition root (``app/main.py``). Without that wiring the port fails
    closed.

    Returns:
        The wired project-catalog port.

    Raises:
        HTTPException 503: The project-catalog port is not wired.
    """
    port = _PORT.get("instance")
    if port is not None:
        return port
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Project catalog port is not wired",
    )

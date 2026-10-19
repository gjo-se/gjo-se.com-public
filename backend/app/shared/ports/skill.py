"""Shared-owned skill-catalog port (import-linter Group F).

The application context builds the CV skill section and manages CV skills, but
the skill entities, their dedup pipeline and the ``project_skill`` junction are
owned by ``app.fbf``. To keep the two bounded contexts independent (the
``independence`` contract forbids direct imports), the application side depends
on the :class:`SkillCatalogPort` protocol only.

The fbf context provides the concrete implementation; it is wired at the
composition root (``app/main.py``) via ``app.dependency_overrides``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient


@dataclass(frozen=True, slots=True)
class CvSkillLink:
    """Raw project↔skill link with its resolved master group metadata."""

    skill_id: int
    original_name: str
    level_public: int | None
    group_id: int | None
    group_sort: int | None
    group_label: str | None


@dataclass(frozen=True, slots=True)
class SkillBlend:
    """A skill with its already blended ``effective_importance``.

    The blend (project importance + global average + curated skill importance)
    is fbf domain logic and is computed inside the adapter, so the application
    side only consumes the ready-made value.
    """

    skill_id: int
    name: str
    level_public: int | None
    group_id: int | None
    sort: int | None
    importance: float


@dataclass(frozen=True, slots=True)
class SkillGroupRef:
    """A curated public skill group (id + localized label)."""

    id: int
    label: str


@dataclass(frozen=True, slots=True)
class PublicSkillRef:
    """Public skill projection for the aggregated About-page response."""

    id: int
    name: str
    level_public: int | None


@runtime_checkable
class SkillCatalogPort(Protocol):
    """Skill operations the application context needs from ``app.fbf``."""

    async def get_cv_skill_links(self, db: AsyncSession, project_id: int) -> list[CvSkillLink]:
        """Return the project's CV skill links (original name + master group)."""
        ...

    async def get_project_public_skills(self, db: AsyncSession, project_id: int) -> list[SkillBlend] | None:
        """Return the project's public skills with blended importance (``None`` if unknown project)."""
        ...

    async def list_public_skills(
        self,
        db: AsyncSession,
        *,
        group_id: int | None = None,
        limit: int | None = None,
        tag: str = "site:public",
        grouped_only: bool = False,
    ) -> list[SkillBlend]:
        """Return tagged public skills with blended importance."""
        ...

    async def list_public_groups(self, db: AsyncSession, locale: str) -> list[SkillGroupRef]:
        """Return the curated public groups (``sort`` ASC) with localized labels."""
        ...

    async def list_public_profile_skills(self, db: AsyncSession) -> list[PublicSkillRef]:
        """Return public profile skills (``level_public > 0``, ``active``) by name."""
        ...

    async def add_project_skills(
        self,
        db: AsyncSession,
        *,
        project_id: int,
        names: list[str],
        core_db: AsyncSession,
        embedding_client: EmbeddingClient,
    ) -> None:
        """Ensure the named skills, link them to the project (idempotent)."""
        ...

    async def exclude_project_skill(self, db: AsyncSession, *, name: str) -> None:
        """Detach, reject and unassign the skill with ``name``.

        Raises:
            ValueError: If no skill with the given name exists.
        """
        ...


_PORT: dict[str, SkillCatalogPort] = {}


def register_skill_catalog_port(port: SkillCatalogPort) -> None:
    """Register the concrete skill-catalog port (composition root).

    Called once from ``app/main.py``. Enables direct (non-HTTP) resolution of the
    port, e.g. from services invoked without a FastAPI request.
    """
    _PORT["instance"] = port


async def get_skill_catalog_port() -> SkillCatalogPort:
    """Resolve the skill-catalog port.

    The concrete implementation lives in the fbf context and is registered at
    the composition root (``app/main.py``). Without that wiring the port fails
    closed.

    Returns:
        The wired skill-catalog port.

    Raises:
        HTTPException 503: The skill-catalog port is not wired.
    """
    port = _PORT.get("instance")
    if port is not None:
        return port
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Skill catalog port is not wired",
    )

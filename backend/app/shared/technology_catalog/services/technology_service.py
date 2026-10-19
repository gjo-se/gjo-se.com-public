"""Service layer for technology_catalog – Admin CRUD with filtering, sorting, and pagination.

Orchestrates over ``TechnologyResponse`` DTOs; every SQLAlchemy/ORM concern lives
in ``technology_repository`` (Achse 2: ``services`` > ``repositories``; the
service query-free contract K1/K2/K3).
"""

from __future__ import annotations

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.technology_catalog.repositories import technology_repository
from app.shared.technology_catalog.repositories.technology_repository import _apply_sorting
from app.shared.technology_catalog.schemas.technology_schemas import (
    TechnologyPatchIn,
    TechnologyResponse,
)

logger = structlog.get_logger(__name__)

_DEFAULT_LIMIT = 20


class TechnologyQueryService:
    """Read model for the technology catalog: paginated list + count.

    Handles dynamic filtering and server-side sorting for collection queries.
    Single-item reads and writes live in :class:`TechnologyService`.
    """

    # Query-builder shim delegating to the repository. Kept as a class attribute
    # so the pure query-guard test stays valid without a SQLAlchemy import in the
    # service layer itself (documented exception).
    _apply_sorting = staticmethod(_apply_sorting)

    async def list_all(
        self,
        db: AsyncSession,
        *,
        q: str | None = None,
        provider: str | None = None,
        technology_type: str | None = None,
        status: str | None = None,
        offset: int = 0,
        limit: int = _DEFAULT_LIMIT,
        sort_by: str = "name",
        sort_dir: str = "asc",
    ) -> list[TechnologyResponse]:
        """Returns the paginated, filtered, sorted catalog as response DTOs."""
        return await technology_repository.list_all(
            db,
            q=q,
            provider=provider,
            technology_type=technology_type,
            status=status,
            offset=offset,
            limit=limit,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )

    async def count(
        self,
        db: AsyncSession,
        *,
        q: str | None = None,
        provider: str | None = None,
        technology_type: str | None = None,
        status: str | None = None,
    ) -> int:
        """Returns the total number of technologies matching the given filters."""
        return await technology_repository.count(
            db,
            q=q,
            provider=provider,
            technology_type=technology_type,
            status=status,
        )


class TechnologyService:
    """Single-item read/write service for the technology catalog."""

    async def get_by_id(
        self,
        db: AsyncSession,
        technology_id: int,
    ) -> TechnologyResponse:
        """Returns a single technology by id, including icons and resolved status.

        Args:
            db: Active async database session.
            technology_id: Primary key of the technology.

        Returns:
            :class:`TechnologyResponse` with icons and status.

        Raises:
            ValueError: If no technology with the given id exists.
        """
        response = await technology_repository.get_by_id(db, technology_id)
        if response is None:
            raise ValueError(f"Technology with id={technology_id} not found")
        return response

    async def patch(
        self,
        db: AsyncSession,
        technology_id: int,
        data: TechnologyPatchIn,
    ) -> TechnologyResponse:
        """Partially updates a technology – only non-None fields are applied.

        Args:
            db: Active async database session.
            technology_id: Primary key of the technology.
            data: Patch payload with optional writable fields.

        Returns:
            Updated :class:`TechnologyResponse` with icons and status.

        Raises:
            ValueError: If no technology with the given id exists.
        """
        response = await technology_repository.patch(db, technology_id, data.model_dump(exclude_unset=True))
        if response is None:
            raise ValueError(f"Technology with id={technology_id} not found")
        return response

"""Business logic for SearchTerm (FBF domain)."""

import structlog
from fastapi import HTTPException, status

from app.fbf.repositories import search_term_repository
from app.fbf.schemas.search_term_schemas import SearchTermOut
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)


async def list_all(db: AsyncSession) -> list[SearchTermOut]:
    """Returns all SearchTerms (including inactive).

    Args:
        db: Database connection.

    Returns:
        List of all SearchTerm DTOs.
    """
    return await search_term_repository.get_all(db)


async def list_all_with_counts(db: AsyncSession) -> list[tuple[SearchTermOut, int, str | None, str | None]]:
    """Returns all SearchTerms with their reference count and core status.

    Args:
        db: Database connection.

    Returns:
        List of (SearchTermOut, reference_count, status_name, status_color_token) tuples.
    """
    return await search_term_repository.get_all_with_counts(db)


async def list_active(db: AsyncSession) -> list[SearchTermOut]:
    """Returns only active SearchTerms (via core_statusable).

    Args:
        db: Database connection.

    Returns:
        List of SearchTerm DTOs with status 'active' (core_statusable).
    """
    return await search_term_repository.get_active(db)


async def create(db: AsyncSession, name: str) -> SearchTermOut:
    """Creates a new SearchTerm.

    Args:
        db: Database connection.
        name: Search term name (must be unique).

    Returns:
        Newly created SearchTerm DTO.

    Raises:
        HTTPException 409: Name already taken.
    """
    existing = await search_term_repository.get_by_name(db, name=name)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SearchTerm with name '{name}' already exists.",
        )
    search_term = await search_term_repository.create(db, name=name)
    logger.info("SearchTerm created: id=%s name=%s", search_term.id, search_term.name)
    return search_term


async def update(
    db: AsyncSession,
    search_term_id: int,
    name: str | None,
) -> SearchTermOut:
    """Updates an existing SearchTerm.

    Args:
        db: Database connection.
        search_term_id: Primary key.
        name: New name (optional).

    Returns:
        Updated SearchTerm DTO.

    Raises:
        HTTPException 404: SearchTerm not found.
        HTTPException 409: Name already taken.
    """
    search_term = await search_term_repository.get_by_id(db, search_term_id)
    if search_term is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchTerm {search_term_id} not found.",
        )
    if name is not None and name != search_term.name:
        existing = await search_term_repository.get_by_name(db, name=name)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"SearchTerm with name '{name}' already exists.",
            )
    updated = await search_term_repository.update(db, search_term_id, name=name)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchTerm {search_term_id} not found.",
        )
    logger.info("SearchTerm updated: id=%s", updated.id)
    return updated


async def delete(db: AsyncSession, search_term_id: int) -> None:
    """Permanently deletes a SearchTerm.

    Args:
        db: Database connection.
        search_term_id: Primary key.

    Raises:
        HTTPException 404: SearchTerm not found.
        HTTPException 409: SearchTerm is referenced by project_freelancer_map entries.
    """
    search_term = await search_term_repository.get_by_id(db, search_term_id)
    if search_term is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchTerm {search_term_id} not found.",
        )
    try:
        await search_term_repository.delete(db, search_term_id)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(err),
        ) from err
    logger.info("SearchTerm deleted: id=%s", search_term_id)

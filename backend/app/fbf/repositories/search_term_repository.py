"""Database access for SearchTerm (FBF domain).

Reads and writes return ``SearchTermOut`` DTOs so the service layer stays free
of ``app.fbf.models`` imports (Achse 2: ``services`` > ``repositories``).
"""

from functools import partial
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.search_term import SearchTerm
from app.fbf.repositories import project_freelancer_map_repository
from app.fbf.schemas.search_term_schemas import SearchTermOut
from app.shared.db_access import repository_helpers
from app.shared.status.models.status import Status, Statusable


def name_by_id_subquery(search_term_id: Any) -> Any:
    """Correlated scalar subquery resolving a SearchTerm name from its id.

    Owner-side projection: consumers (e.g. the Project list sorting by
    ``search_term``) embed this subquery with their own FK column instead of
    importing the SearchTerm model across the aggregate boundary.

    Args:
        search_term_id: The consumer's foreign-key column referencing the term.

    Returns:
        Scalar subquery yielding the SearchTerm name (NULL when the FK is unset).
    """
    return select(SearchTerm.name).where(SearchTerm.id == search_term_id).scalar_subquery()


_to_out = partial(repository_helpers.to_out, dto_cls=SearchTermOut)


async def get_all(db: AsyncSession) -> list[SearchTermOut]:
    """Returns all SearchTerms (including inactive).

    Args:
        db: Active gjo_se_com database connection.

    Returns:
        List of all SearchTerm DTOs.
    """
    result = await db.execute(select(SearchTerm))
    return [_to_out(row) for row in result.scalars().all()]


async def get_all_with_status(
    db: AsyncSession,
) -> list[tuple[SearchTermOut, str | None, str | None]]:
    """Returns all SearchTerms with their core status.

    Args:
        db: Active gjo_se_com database connection.

    Returns:
        List of (SearchTermOut, status_name, status_color_token) tuples.
    """
    stmt = (
        select(
            SearchTerm,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "fbf_search_term") & (Statusable.statusable_id == SearchTerm.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
    )
    result = await db.execute(stmt)
    return [(_to_out(row[0]), row[1], row[2]) for row in result.all()]


async def get_all_with_counts(
    db: AsyncSession,
) -> list[tuple[SearchTermOut, int, str | None, str | None]]:
    """Returns all SearchTerms with reference count and core status.

    The raw-project reference count is owned by the ProjectFreelancerMap
    aggregate; this repository delegates to its owner
    (``project_freelancer_map_repository.count_by_search_term_ids``) instead of
    importing the foreign model across the aggregate boundary.

    Args:
        db: Active gjo_se_com database connection.

    Returns:
        List of (SearchTermOut, reference_count, status_name, status_color_token) tuples.
    """
    terms_with_status = await get_all_with_status(db)
    counts = await project_freelancer_map_repository.count_by_search_term_ids(
        db, [term.id for term, _, _ in terms_with_status]
    )
    return [
        (term, counts.get(term.id, 0), status_name, status_color)
        for term, status_name, status_color in terms_with_status
    ]


async def get_active(db: AsyncSession) -> list[SearchTermOut]:
    """Returns only active SearchTerms (via core_statusable).

    Args:
        db: Active gjo_se_com database connection.

    Returns:
        List of SearchTerm DTOs with status 'active'.
    """
    stmt = (
        select(SearchTerm)
        .join(
            Statusable,
            (Statusable.statusable_type == "fbf_search_term") & (Statusable.statusable_id == SearchTerm.id),
        )
        .join(Status, Status.id == Statusable.status_id)
        .where(Status.name == "active")
    )
    result = await db.execute(stmt)
    return [_to_out(row) for row in result.scalars().all()]


async def get_by_id(db: AsyncSession, search_term_id: int) -> SearchTermOut | None:
    """Returns a SearchTerm by ID.

    Args:
        db: Active gjo_se_com database connection.
        search_term_id: Primary key.

    Returns:
        SearchTerm DTO or None if not found.
    """
    result = await db.execute(select(SearchTerm).where(SearchTerm.id == search_term_id))
    row = result.scalar_one_or_none()
    return _to_out(row) if row is not None else None


async def get_by_name(db: AsyncSession, name: str) -> SearchTermOut | None:
    """Returns a SearchTerm by name.

    Args:
        db: Active gjo_se_com database connection.
        name: Search term name.

    Returns:
        SearchTerm DTO or None if not found.
    """
    result = await db.execute(select(SearchTerm).where(SearchTerm.name == name))
    row = result.scalar_one_or_none()
    return _to_out(row) if row is not None else None


async def create(db: AsyncSession, name: str) -> SearchTermOut:
    """Creates a new SearchTerm.

    Args:
        db: Active gjo_se_com database connection.
        name: Search term name (unique).

    Returns:
        Newly created SearchTerm DTO.
    """
    search_term = SearchTerm(name=name)
    db.add(search_term)
    await db.commit()
    await db.refresh(search_term)
    return _to_out(search_term)


async def update(db: AsyncSession, search_term_id: int, name: str | None) -> SearchTermOut | None:
    """Updates an existing SearchTerm.

    Args:
        db: Active gjo_se_com database connection.
        search_term_id: Primary key of the term to update.
        name: New name – only applied if not None.

    Returns:
        Updated SearchTerm DTO, or None when it does not exist.
    """
    search_term = await db.get(SearchTerm, search_term_id)
    if search_term is None:
        return None
    if name is not None:
        search_term.name = name
    await db.commit()
    await db.refresh(search_term)
    return _to_out(search_term)


async def delete(db: AsyncSession, search_term_id: int) -> bool:
    """Permanently deletes a SearchTerm.

    Args:
        db: Active gjo_se_com database connection.
        search_term_id: Primary key of the term to delete.

    Returns:
        True when the row was deleted; False when no row with the id exists.

    Raises:
        ValueError: The term is still referenced by project_freelancer_map rows.
    """
    search_term = await db.get(SearchTerm, search_term_id)
    if search_term is None:
        return False
    try:
        await db.delete(search_term)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(f"SearchTerm '{search_term.name}' wird noch von Freelancermap-Einträgen verwendet.") from exc
    return True

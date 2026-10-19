"""Database access for FBF job role entries (gjo_se_com).

Reads and writes return ``JobRoleOut`` DTOs so the service layer stays free of
``app.fbf.models`` imports (Achse 2: ``services`` > ``repositories``).
"""

from functools import partial
from typing import Any

from sqlalchemy import Select, asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.job_role import JobRole
from app.fbf.schemas.job_role_schemas import JobRoleOut
from app.shared.db_access import repository_helpers
from app.shared.status.models.status import Status, Statusable

_SORTABLE_COLUMNS: dict[str, Any] = {
    "name": JobRole.name,
}
_DEFAULT_SORT = "name"


def name_by_id_subquery(job_role_id: Any) -> Any:
    """Correlated scalar subquery resolving a job-role name from its id.

    Owner-side projection: consumers (e.g. the Project list sorting by
    ``job_role_name``) embed this subquery with their own FK column instead of
    importing the JobRole model across the aggregate boundary.

    Args:
        job_role_id: The consumer's foreign-key column referencing the job role.

    Returns:
        Scalar subquery yielding the job-role name (NULL when the FK is unset).
    """
    return select(JobRole.name).where(JobRole.id == job_role_id).scalar_subquery()


_to_out = partial(repository_helpers.to_out, dto_cls=JobRoleOut)


def _apply_filters(stmt: Select[Any], q: str | None, status: str | None = None) -> Select[Any]:
    """Applies search-text and status filters on the job role query.

    Args:
        stmt: SQLAlchemy Select statement.
        q: Search term (optional).
        status: Curation status filter (optional).

    Returns:
        Filtered statement.
    """
    if q:
        stmt = stmt.where(JobRole.name.ilike(f"%{q}%"))
    if status:
        status_subq = (
            select(Statusable.statusable_id)
            .join(Status, Status.id == Statusable.status_id)
            .where(
                Statusable.statusable_type == "fbf_job_role",
                Status.name == status,
            )
        ).scalar_subquery()
        stmt = stmt.where(JobRole.id.in_(status_subq))
    return stmt


async def get_all_with_status(db: AsyncSession) -> list[tuple[JobRoleOut, str | None, str | None]]:
    """Return all job roles with their core status (name + color_token), ordered by name."""
    stmt = (
        select(
            JobRole,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "fbf_job_role") & (Statusable.statusable_id == JobRole.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .order_by(JobRole.name)
    )
    result = await db.execute(stmt)
    return [(_to_out(row[0]), row[1], row[2]) for row in result.all()]


async def get_all(db: AsyncSession) -> list[JobRoleOut]:
    """Return all job roles ordered by name."""
    result = await db.execute(select(JobRole).order_by(JobRole.name))
    return [_to_out(row) for row in result.scalars().all()]


async def get_confirmed(db: AsyncSession) -> list[JobRoleOut]:
    """Return all confirmed job roles ordered by name."""
    result = await db.execute(
        select(JobRole)
        .where(
            JobRole.id.in_(
                select(Statusable.statusable_id)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == "fbf_job_role",
                    Status.name == "active",
                )
            )
        )
        .order_by(JobRole.name)
    )
    return [_to_out(row) for row in result.scalars().all()]


async def count_filtered(db: AsyncSession, q: str | None = None, status: str | None = None) -> int:
    """Returns the number of matching job roles."""
    stmt = select(func.count()).select_from(JobRole)
    stmt = _apply_filters(stmt, q, status)
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_paginated_with_status(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "asc",
    status: str | None = None,
) -> list[tuple[JobRoleOut, str | None, str | None]]:
    """Returns paginated job roles alongside their core status.

    Project usage counts belong to the Project aggregate and are resolved by the
    Project owner (``project_repository``); see
    ``job_role_service.list_paginated_with_counts``.
    """
    column = _SORTABLE_COLUMNS.get(sort_by, JobRole.name)
    order_expr = desc(column) if sort_order == "desc" else asc(column)
    stmt = (
        select(
            JobRole,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "fbf_job_role") & (Statusable.statusable_id == JobRole.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .order_by(order_expr)
    )
    stmt = _apply_filters(stmt, q, status)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return [(_to_out(row[0]), row[1], row[2]) for row in result.all()]


async def get_by_id(db: AsyncSession, job_role_id: int) -> JobRoleOut | None:
    """Return a single job role by primary key as DTO."""
    row = await db.get(JobRole, job_role_id)
    return _to_out(row) if row is not None else None


async def get_by_ids(db: AsyncSession, job_role_ids: list[int]) -> list[JobRoleOut]:
    """Return all job roles whose primary key is in ``job_role_ids``."""
    if not job_role_ids:
        return []
    result = await db.execute(select(JobRole).where(JobRole.id.in_(job_role_ids)))
    return [_to_out(row) for row in result.scalars().all()]


async def get_by_name(db: AsyncSession, name: str) -> JobRoleOut | None:
    """Return a job role by unique name as DTO."""
    result = await db.execute(select(JobRole).where(JobRole.name == name))
    row = result.scalar_one_or_none()
    return _to_out(row) if row is not None else None


async def create(db: AsyncSession, name: str) -> JobRoleOut:
    """Persist a new job role from its name and return the DTO."""
    job_role = JobRole(name=name)
    db.add(job_role)
    await db.flush()
    await db.refresh(job_role)
    return _to_out(job_role)


async def update(db: AsyncSession, job_role_id: int, name: str) -> JobRoleOut | None:
    """Rename a job role and return its DTO, or ``None`` when it does not exist."""
    job_role = await db.get(JobRole, job_role_id)
    if job_role is None:
        return None
    job_role.name = name
    await db.flush()
    await db.refresh(job_role)
    return _to_out(job_role)


async def delete(db: AsyncSession, job_role_id: int) -> bool:
    """Remove a job role by id.

    Returns:
        True when the row was deleted; False when no row with the id exists.
    """
    job_role = await db.get(JobRole, job_role_id)
    if job_role is None:
        return False
    await db.delete(job_role)
    await db.flush()
    return True

"""Read access for normalised Project entries (AIScope domain).

Owns the list/detail/neighbour reads, the owner-side projection selects and the
job-role reference counts. Split out of ``project_repository``
(God-File-Refactor); the filter builders live in
``project_filter_repository``, the sort builders in
``project_sort_repository`` and the read-model in
``project_read_model_repository``.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.repositories.project_filter_repository import (
    ProjectFilter,
    _apply_filters,
    _freelancermap_id_subquery,
)
from app.fbf.repositories.project_read_model_repository import ProjectRow, _to_out
from app.fbf.repositories.project_sort_repository import (
    _DEFAULT_SORT,
    _build_order_by,
    _slave_count_subquery,
)
from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.status.models.status import Status, Statusable


async def get_all(
    db: AsyncSession,
    filters: ProjectFilter,
    *,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "desc",
    offset: int = 0,
    limit: int = 50,
) -> list[ProjectRow]:
    """Returns paginated normalised projects.

    Args:
        db: Active gjo_se_com database connection.
        filters: Project filter parameters.
        sort_by: Column name for sorting (whitelist, default=posted_at).
            Also supports ``slave_count`` (computed).
        sort_order: Sort direction – ``asc`` or ``desc`` (default=desc).
        offset: Number of entries to skip.
        limit: Maximum number of entries.

    Returns:
        List of ``ProjectRow`` read-models (Projekt + projizierte View-Felder),
        sorted by ``sort_by``/``sort_order``.
    """
    # Correlated subquery: count slave projects (selected as runtime attribute)
    slave_count_col = _slave_count_subquery()

    # Effective ORDER BY incl. id-tiebreaker – identical to get_neighbors.
    stmt = (
        select(
            Project,
            slave_count_col,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "project") & (Statusable.statusable_id == Project.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .order_by(*_build_order_by(sort_by, sort_order))
    )
    stmt = _apply_filters(stmt, filters)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    result_rows: list[ProjectRow] = [
        ProjectRow(
            project=_to_out(row.Project),
            slave_count=row.slave_count,
            status=row.status_name,
            status_color_token=row.status_color_token,
        )
        for row in rows
    ]

    return result_rows


async def get_neighbors(
    db: AsyncSession,
    project_id: int,
    filters: ProjectFilter,
    *,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "desc",
) -> tuple[int | None, int | None]:
    """Returns the previous/next project ids for the same filtered, sorted view.

    Seek-neighbour lookup over the exact effective ORDER BY of ``get_all``
    (primary sort + ``id`` tiebreaker). The identically ordered id sequence is
    fetched via the same ``_apply_filters`` and ``_build_order_by``, which
    guarantees consistency with the list – including NULLS handling and the
        computed ``slave_count``/``search_term`` sorts – without re-deriving fragile
        keyset predicates per sort column.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Anchor project whose neighbours are requested.
        filters: Project filter parameters.
        sort_by: Column name for sorting (default=posted_at).
        sort_order: Sort direction – ``asc`` or ``desc`` (default=desc).

    Returns:
        Tuple ``(prev_id, next_id)``. Either side is ``None`` at the boundary
        of the result set; ``(None, None)`` if ``project_id`` is not in the view.
    """
    stmt = select(Project.id).order_by(*_build_order_by(sort_by, sort_order))
    stmt = _apply_filters(stmt, filters)
    result = await db.execute(stmt)
    ids = [row[0] for row in result.all()]

    try:
        index = ids.index(project_id)
    except ValueError:
        return None, None

    prev_id = ids[index - 1] if index > 0 else None
    next_id = ids[index + 1] if index < len(ids) - 1 else None
    return prev_id, next_id


async def count(
    db: AsyncSession,
    filters: ProjectFilter,
) -> int:
    """Returns the number of normalised projects.

    Args:
        db: Active gjo_se_com database connection.
        filters: Project filter parameters.

    Returns:
        Number of matching entries.
    """
    stmt = select(func.count()).select_from(Project)
    stmt = _apply_filters(stmt, filters)
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_slaves(db: AsyncSession, master_id: int) -> list[Project]:
    """Returns all slave projects for a given master.

    Each slave carries ``freelancermap_id`` as a runtime attribute (raw
    ProjectFreelancerMap PK, resolved by url) so the detail view can link to the
    raw dataset (``None`` when no raw entry exists).

    Args:
        db: Active gjo_se_com database connection.
        master_id: Primary key of the master project.

    Returns:
        List of slave Project entries (canonical_id = master_id, excluding the master itself).
    """
    result = await db.execute(
        select(Project).where(
            Project.canonical_id == master_id,
            Project.id != master_id,
        )
    )
    return list(result.scalars().all())


async def get_slaves_rows(db: AsyncSession, master_id: int) -> list[ProjectRow]:
    """Slave read-models (entity + projected ``freelancermap_id``) for endpoints.

    Unlike :func:`get_slaves` (plain entities for internal logic), this returns
    the raw-dataset PK per slave for the list projection.
    """
    result = await db.execute(
        select(Project, _freelancermap_id_subquery()).where(
            Project.canonical_id == master_id,
            Project.id != master_id,
        )
    )
    return [ProjectRow(project=_to_out(row.Project), freelancermap_id=row.freelancermap_id) for row in result.all()]


async def get_by_id(db: AsyncSession, project_id: int) -> Project | None:
    """Returns a normalised project by ID (plain ORM entity).

    View/projection values (``status``/``status_color_token``/``freelancermap_id``)
    are intentionally **not** attached – endpoints that need them use
    :func:`get_detail` (read-model projection). Service-layer callers use
    :func:`get_out_by_id` (DTO) instead.
    """
    return await db.scalar(select(Project).where(Project.id == project_id))


async def get_out_by_id(db: AsyncSession, project_id: int) -> ProjectOut | None:
    """Returns a normalised project by ID as DTO (service-boundary type)."""
    project = await db.scalar(select(Project).where(Project.id == project_id))
    return _to_out(project) if project is not None else None


async def get_slaves_out(db: AsyncSession, master_id: int) -> list[ProjectOut]:
    """Returns all slave projects of a master as DTOs.

    Args:
        db: Active gjo_se_com database connection.
        master_id: Primary key of the master project.

    Returns:
        List of slave projects (canonical_id = master_id, excluding the master).
    """
    result = await db.execute(
        select(Project).where(
            Project.canonical_id == master_id,
            Project.id != master_id,
        )
    )
    return [_to_out(project) for project in result.scalars().all()]


async def exists(db: AsyncSession, project_id: int) -> bool:
    """Return True when a project with ``project_id`` exists."""
    return await db.scalar(select(Project.id).where(Project.id == project_id)) is not None


async def get_masters_with_merged_description(db: AsyncSession) -> list[ProjectOut]:
    """Return all masters that carry a consolidated description as DTOs.

    Args:
        db: Active gjo_se_com database connection.

    Returns:
        Masters (``canonical_id IS NULL`` and ``merged_description_de IS NOT NULL``).
    """
    result = await db.execute(
        select(Project).where(
            Project.canonical_id.is_(None),
            Project.merged_description_de.is_not(None),
        )
    )
    return [_to_out(project) for project in result.scalars().all()]


async def get_projects_without_vector(db: AsyncSession, *, limit: int | None = None) -> list[ProjectOut]:
    """Return projects whose ``vector`` is still NULL as DTOs, ordered by id.

    Args:
        db: Active gjo_se_com database connection.
        limit: If set, return at most this many projects.

    Returns:
        Projects with ``vector IS NULL`` (optionally truncated).
    """
    stmt = select(Project).where(Project.vector.is_(None)).order_by(Project.id)
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return [_to_out(project) for project in result.scalars().all()]


async def get_detail(db: AsyncSession, project_id: int) -> ProjectRow | None:
    """Returns a project read-model (entity + projected status/color/raw-id).

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.

    Returns:
        ``ProjectRow`` read-model or ``None`` if not found.
    """
    stmt = (
        select(
            Project,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
            _freelancermap_id_subquery(),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "project") & (Statusable.statusable_id == Project.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .where(Project.id == project_id)
    )
    result = await db.execute(stmt)
    row = result.one_or_none()
    if row is None:
        return None
    return ProjectRow(
        project=_to_out(row.Project),
        status=row.status_name,
        status_color_token=row.status_color_token,
        freelancermap_id=row.freelancermap_id,
    )


async def get_by_url(db: AsyncSession, url: str) -> Project | None:
    """Returns a normalised project by its globally unique URL.

    Used by the create path to guard the ``url`` uniqueness (Dedup).

    Args:
        db: Active gjo_se_com database connection.
        url: Full project URL (global dedup key).

    Returns:
        Project or None if no project has this URL.
    """
    result = await db.execute(select(Project).where(Project.url == url))
    return result.scalar_one_or_none()


async def get_all_ids(db: AsyncSession) -> list[int]:
    """Return all master project IDs (unfiltered).

    Used for bulk score recalculation.
    """
    result = await db.execute(
        select(Project.id).where(Project.canonical_id.is_(None)).order_by(Project.id),
    )
    return [row[0] for row in result.all()]


async def get_by_url_out(db: AsyncSession, url: str) -> ProjectOut | None:
    """Returns a normalised project by its globally unique URL as DTO."""
    project = await db.scalar(select(Project).where(Project.url == url))
    return _to_out(project) if project is not None else None


async def get_titles(db: AsyncSession, project_ids: Sequence[int]) -> dict[int, tuple[str, str | None]]:
    """Return a ``project_id -> (title, title_normalized)`` projection.

    Args:
        db: Active gjo_se_com database connection.
        project_ids: Project ids whose titles are resolved.

    Returns:
        Mapping of project id to ``(title, title_normalized)`` (missing ids omitted).
    """
    ids = list(project_ids)
    if not ids:
        return {}
    result = await db.execute(select(Project.id, Project.title, Project.title_normalized).where(Project.id.in_(ids)))
    return {row[0]: (row[1], row[2]) for row in result.all()}


def project_title_select() -> Select[Any]:
    """Owner-side ``(project_id, title, title_normalized)`` projection.

    Consumers (e.g. the application submission list) embed this projection
    instead of importing the Project model across the aggregate boundary.
    """
    return select(
        Project.id.label("project_id"),
        Project.title.label("title"),
        Project.title_normalized.label("title_normalized"),
    )


def master_project_ids_select() -> Any:
    """Owner-side select of all master project ids (``canonical_id IS NULL``).

    The Project aggregate owns the canonical/slave distinction; consumers such
    as the Skill aggregate filter their ``project_skill`` links against this
    projection without importing the foreign Project model.
    """
    return select(Project.id).where(Project.canonical_id.is_(None))


def master_project_ids_for_job_role_select(role_id: int) -> Select[Any]:
    """Owner-side select of master project ids classified to a job role.

    Consumers (e.g. the Skill aggregate ranking skills for a role) embed this
    projection instead of importing the foreign ``Project`` model.

    Args:
        role_id: Job role id whose master projects are selected.

    Returns:
        Select of master project ids (``canonical_id IS NULL``, ``job_role_id`` == role_id).
    """
    return select(Project.id).where(Project.canonical_id.is_(None), Project.job_role_id == role_id)


def master_projects_posted_at_select(role_id: int | None = None) -> Select[Any]:
    """Owner-side projection of master projects with a ``posted_at`` value.

    Returns ``(project_id, posted_at)`` for all masters (``canonical_id IS NULL``)
    that carry a ``posted_at``. Consumers embed this as a subquery so they never
    import the foreign ``Project`` model (e.g. the skill-trend/impact charts).

    Args:
        role_id: When set, only masters classified to this job role.

    Returns:
        Select of ``(project_id, posted_at)`` labelled columns.
    """
    stmt = select(Project.id.label("project_id"), Project.posted_at.label("posted_at")).where(
        Project.canonical_id.is_(None),
        Project.posted_at.is_not(None),
    )
    if role_id is not None:
        stmt = stmt.where(Project.job_role_id == role_id)
    return stmt


async def count_by_job_role(db: AsyncSession, job_role_id: int) -> int:
    """Return the number of projects referencing the given job role.

    Owner-side read: the Project aggregate owns ``Project.job_role_id``, so the
    job-role lifecycle asks the Project owner instead of reaching into the
    foreign aggregate.

    Args:
        db: Active gjo_se_com database connection.
        job_role_id: Job role id whose referencing projects are counted.

    Returns:
        Number of projects referencing the job role.
    """
    result = await db.execute(select(func.count()).select_from(Project).where(Project.job_role_id == job_role_id))
    return result.scalar_one()


async def count_by_job_role_ids(db: AsyncSession, job_role_ids: Sequence[int]) -> dict[int, int]:
    """Return ``job_role_id -> project count`` for the given job roles.

    Batch variant of :func:`count_by_job_role` used by the job-role admin list;
    job roles without referencing projects are simply absent from the mapping.

    Args:
        db: Active gjo_se_com database connection.
        job_role_ids: Job role ids to count referencing projects for.

    Returns:
        Mapping of job-role id to number of referencing projects.
    """
    if not job_role_ids:
        return {}
    result = await db.execute(
        select(Project.job_role_id, func.count(Project.id))
        .where(Project.job_role_id.in_(job_role_ids))
        .group_by(Project.job_role_id)
    )
    return {row[0]: row[1] for row in result.all()}

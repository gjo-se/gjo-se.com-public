"""Canonical grouping (master/slave) for Project entries (AIScope domain).

Owns the link/unlink/switch operations on ``project.canonical_id`` plus the
slave/master candidate lookups. Split out of ``project_repository``
(God-File-Refactor) so the grouping lifecycle stays cohesive.
"""

from __future__ import annotations

from sqlalchemy import String as SAString
from sqlalchemy import delete, func, or_, select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.fbf.models.project import Project
from app.fbf.repositories.project_read_model_repository import ProjectRow, _to_out
from app.fbf.schemas.project_schemas import ProjectOut


async def set_canonical_grouping(
    db: AsyncSession,
    project_id: int,
    canonical_project_id: int | None,
) -> tuple[str, list[int]]:
    """Link or unlink a project as slave, operating purely on ``project``.

    Master/slave grouping lives entirely in ``project.canonical_id`` – the
    freelancermap table is only used during scraping/mapping. In both cases the
    ``merged_at`` of every affected project is reset to force a fresh summary.

    Args:
        db: Active gjo_se_com database connection.
        project_id: ID of the project to link/unlink.
        canonical_project_id: Target master project ID, or ``None`` to unlink.

    Returns:
        Tuple ``(status_str, repointed_slave_ids)`` – ``status_str`` is
        ``"linked"`` or ``"unlinked"``.
    """
    project = await db.get(Project, project_id)
    if project is None:
        raise ValueError(f"Project {project_id} not found.")

    old_master_id = project.canonical_id
    repointed_slave_ids: list[int] = []

    if canonical_project_id is None:
        project.canonical_id = None
        project.similarity_score = 1.0
        project.merged_at = None
        status_str = "unlinked"
    else:
        repointed_result = await db.execute(
            sa_update(Project)
            .where(Project.canonical_id == project_id)
            .values(canonical_id=canonical_project_id, merged_at=None)
            .returning(Project.id)
        )
        repointed_slave_ids = [row[0] for row in repointed_result.all()]
        project.canonical_id = canonical_project_id
        project.merged_at = None
        master = await db.get(Project, canonical_project_id)
        if master is not None:
            master.merged_at = None
        status_str = "linked"

    if old_master_id is not None and old_master_id != canonical_project_id:
        old_master = await db.get(Project, old_master_id)
        if old_master is not None:
            old_master.merged_at = None

    await db.commit()
    return status_str, repointed_slave_ids


async def unlink_project(db: AsyncSession, project_id: int) -> int | None:
    """Promote a slave project to master (``canonical_id = None``).

    Args:
        db: Active gjo_se_com database connection.
        project_id: Slave project to promote.

    Returns:
        The former master id, or None when the project had none.
    """
    project = await db.get(Project, project_id)
    if project is None:
        raise ValueError(f"Project {project_id} not found.")
    old_master_id = project.canonical_id
    project.canonical_id = None
    if old_master_id is not None:
        old_master = await db.get(Project, old_master_id)
        if old_master is not None:
            old_master.merged_at = None
    return old_master_id


async def switch_canonical_grouping(db: AsyncSession, project_id: int) -> tuple[int, int]:
    """Promote a slave project to master and degrade its old master to a slave.

    Reassigns all other slaves of the old master to the newly promoted project
    and transfers the ``job_role_id``. The old master is not deleted – it
    becomes a slave.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Slave project to promote.

    Returns:
        Tuple ``(old_master_id, promoted_project_id)``.
    """
    slave_project = await db.get(Project, project_id)
    if slave_project is None:
        raise ValueError(f"Project {project_id} not found.")
    old_master_id = slave_project.canonical_id
    if old_master_id is None:
        raise ValueError(f"Project {project_id} is already a master.")
    old_master = await db.get(Project, old_master_id)
    if old_master is None:
        raise ValueError(f"Master Project {old_master_id} not found.")

    promoted_project_id = slave_project.id
    slave_project.canonical_id = None
    slave_project.similarity_score = 1.0
    slave_project.merged_at = None

    old_master.canonical_id = promoted_project_id
    old_master.merged_at = None

    _ = await db.execute(
        sa_update(Project)
        .where(Project.canonical_id == old_master_id, Project.id != promoted_project_id)
        .values(canonical_id=promoted_project_id)
    )

    if old_master.job_role_id is not None:
        slave_project.job_role_id = old_master.job_role_id

    return old_master_id, promoted_project_id


async def set_canonical_link(
    db: AsyncSession,
    project_id: int,
    canonical_project_id: int | None,
) -> int | None:
    """Point a project at a master (or unlink when ``canonical_project_id`` is None).

    Args:
        db: Active gjo_se_com database connection.
        project_id: Project to (un)link.
        canonical_project_id: Target master id, or None to promote to master.

    Returns:
        The previous master id, or None.
    """
    project = await db.get(Project, project_id)
    if project is None:
        raise ValueError(f"Project {project_id} not found.")
    old_master_id = project.canonical_id
    project.canonical_id = canonical_project_id
    if canonical_project_id is None:
        project.merged_at = None
    else:
        master = await db.get(Project, canonical_project_id)
        if master is not None:
            master.merged_at = None
    await db.flush()
    return old_master_id


async def cleanup_old_master(db: AsyncSession, old_master_id: int) -> None:
    """Delete an orphaned old master, else mark its merge stale.

    Args:
        db: Active gjo_se_com database connection.
        old_master_id: Former master project id.
    """
    remaining = await db.scalar(select(func.count(Project.id)).where(Project.canonical_id == old_master_id))
    if remaining == 0:
        _ = await db.execute(delete(Project).where(Project.id == old_master_id))
        return
    old_master = await db.get(Project, old_master_id)
    if old_master is not None:
        old_master.merged_at = None


async def find_slave_candidates(
    db: AsyncSession,
    *,
    q: str | None = None,
    exclude_canonical_id: int,
    limit: int = 7,
) -> list[ProjectRow]:
    """Returns projects eligible as slaves for a given master.

    Candidates must not already belong to the excluded master, must have no
    children of their own (slave_count = 0) and must not be the master itself.

    Args:
        db: Active gjo_se_com database connection.
        q: Search term (matches id prefix + title).
        exclude_canonical_id: ID of the master to exclude from candidates.
        limit: Maximum number of results.

    Returns:
        List of ``ProjectRow`` read-models (project DTO + projected ``slave_count``).
    """
    slave_alias = aliased(Project)
    slave_count_col = (
        select(func.count(slave_alias.id))
        .where(slave_alias.canonical_id == Project.id)
        .correlate(Project)
        .scalar_subquery()
    )

    stmt = select(Project, slave_count_col.label("cnt"))
    stmt = stmt.where(Project.id != exclude_canonical_id)
    stmt = stmt.where(
        or_(
            Project.canonical_id.is_(None),
            Project.canonical_id != exclude_canonical_id,
        )
    )
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Project.title.ilike(pattern),
                func.cast(Project.id, SAString).ilike(pattern),
            )
        )
    stmt = stmt.order_by(Project.title).limit(limit)

    result = await db.execute(stmt)
    return [ProjectRow(project=_to_out(row.Project), slave_count=row.cnt) for row in result.all() if row.cnt == 0]


async def find_master_candidates(
    db: AsyncSession,
    *,
    q: str | None = None,
    exclude_id: int,
    exclude_current_master_id: int,
    limit: int = 7,
) -> list[ProjectOut]:
    """Returns master projects eligible to become a new master for a slave.

    Candidates must be a master (``canonical_id IS NULL``), not the slave itself
    and not the current master.

    Args:
        db: Active gjo_se_com database connection.
        q: Search term (matches id prefix + title).
        exclude_id: ID of the slave to exclude.
        exclude_current_master_id: ID of the current master to exclude.
        limit: Maximum number of results.

    Returns:
        List of eligible master projects as DTOs.
    """
    stmt = select(Project)
    stmt = stmt.where(Project.canonical_id.is_(None))
    stmt = stmt.where(Project.id != exclude_id)
    stmt = stmt.where(Project.id != exclude_current_master_id)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Project.title.ilike(pattern),
                func.cast(Project.id, SAString).ilike(pattern),
            )
        )
    stmt = stmt.order_by(Project.title).limit(limit)

    result = await db.execute(stmt)
    return [_to_out(project) for project in result.scalars().all()]

"""Single-project mutations for normalised Project entries (AIScope domain).

Owns the ``set_*`` writers, the create/delete writers and the job-role
reassignment that the Project aggregate performs on its own rows. Split out of
``project_repository`` (God-File-Refactor); the status/archive transitions live
in ``project_status_repository`` and the canonical grouping in
``project_canonical_repository``.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Any, cast

from sqlalchemy import CursorResult, delete
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.repositories.project_read_model_repository import _to_out
from app.fbf.schemas.project_schemas import ProjectOut


async def set_vector(db: AsyncSession, project_id: int, vector: list[float]) -> None:
    """Persist an embedding vector on a project.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Project whose vector is written.
        vector: The embedding vector to store.
    """
    project = await db.get(Project, project_id)
    if project is None:
        return
    project.vector = vector
    await db.flush()


async def set_merged_fields(
    db: AsyncSession,
    project_id: int,
    *,
    merged_description_de: str,
    merged_at: datetime.datetime,
    call_log_id: int | None = None,
) -> None:
    """Persist the merged description + timestamp (and optional call-log id).

    Args:
        db: Active gjo_se_com database connection.
        project_id: Master project whose merge result is written.
        merged_description_de: The consolidated German description.
        merged_at: Timestamp of the merge.
        call_log_id: Optional LLM call-log id (stream merge path).
    """
    project = await db.get(Project, project_id)
    if project is None:
        return
    project.merged_description_de = merged_description_de
    project.merged_at = merged_at
    if call_log_id is not None:
        project.last_merge_call_log_id = call_log_id
    await db.flush()


async def set_endcustomer(db: AsyncSession, project_id: int, endcustomer: bool) -> None:
    """Set the ``endcustomer`` flag on a project.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Project whose flag is written.
        endcustomer: New flag value.
    """
    project = await db.get(Project, project_id)
    if project is None:
        return
    project.endcustomer = endcustomer
    await db.flush()


async def create_slave(
    db: AsyncSession,
    *,
    url: str,
    title: str,
    description: str,
    canonical_id: int,
    posted_at: datetime.datetime,
) -> int:
    """Persist a new slave project linked to its master and return its id.

    Args:
        db: Active gjo_se_com database connection.
        url: Unique project URL (the schema requires a non-null dedup key).
        title: Slave project title.
        description: Slave project description.
        canonical_id: Master project id the slave points to.
        posted_at: Creation timestamp of the slave.

    Returns:
        The generated primary key of the slave project.
    """
    slave = Project(
        url=url,
        title=title,
        description=description,
        canonical_id=canonical_id,
        posted_at=posted_at,
        city=None,
    )
    db.add(slave)
    await db.flush()
    return slave.id


async def set_job_role(db: AsyncSession, project_id: int, job_role_id: int | None) -> None:
    """Set the classified job role of a project.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Project whose ``job_role_id`` is written.
        job_role_id: Target job role id, or None to clear.
    """
    project = await db.get(Project, project_id)
    if project is None:
        return
    project.job_role_id = job_role_id
    await db.flush()


async def set_scores(
    db: AsyncSession,
    project_id: int,
    *,
    match_score: Decimal | None,
    confirmed_score: Decimal | None,
) -> None:
    """Persist the computed match scores of a project.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Project whose scores are written.
        match_score: Weighted coverage across all non-blacklisted skills.
        confirmed_score: Coverage across ``active`` skills only.
    """
    project = await db.get(Project, project_id)
    if project is None:
        return
    project.match_score = match_score
    project.confirmed_score = confirmed_score
    await db.flush()


async def create_master(
    db: AsyncSession,
    *,
    url: str,
    title: str,
    fields: dict[str, object],
) -> ProjectOut:
    """Build and persist a new master project, returning its DTO.

    Args:
        db: Active gjo_se_com database connection.
        url: Project URL (globally unique dedup key).
        title: Project title.
        fields: Remaining scalar project fields (already validated).

    Returns:
        The created project as DTO.
    """
    project = Project(url=url, title=title, **fields)
    project.canonical_id = None
    project.similarity_score = 1.0
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return _to_out(project)


async def delete_by_id(db: AsyncSession, project_id: int) -> None:
    """Permanently deletes a normalised project including related junction entries.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
    """
    _ = await db.execute(delete(Project).where(Project.id == project_id))
    await db.commit()


async def reassign_job_role(db: AsyncSession, from_role_id: int, target_id: int | None) -> int:
    """Repoint all projects from one job role to ``target_id`` (or NULL).

    Owner-side write: the Project aggregate owns ``Project.job_role_id``, so the
    job-role lifecycle delegates reassignment to the Project owner instead of
    mutating the foreign aggregate through a job-role repository.

    Args:
        db: Active gjo_se_com database connection.
        from_role_id: Current job role id whose projects are repointed.
        target_id: New job role id, or None to clear the assignment.

    Returns:
        Number of projects updated.
    """
    result = await db.execute(
        sa_update(Project).where(Project.job_role_id == from_role_id).values(job_role_id=target_id)
    )
    await db.flush()
    return cast(CursorResult[Any], result).rowcount or 0

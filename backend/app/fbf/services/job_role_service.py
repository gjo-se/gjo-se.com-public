"""Business logic for FBF job roles (gjo_se_com)."""

from fastapi import HTTPException, status

from app.fbf.repositories import job_role_repository, project_repository
from app.fbf.schemas.job_role_schemas import JobRoleOut
from app.shared.db_access.session_types import AsyncSession
from app.shared.status.services import status_service


async def list_job_roles(db: AsyncSession) -> list[JobRoleOut]:
    """Return all job roles ordered by name."""
    return await job_role_repository.get_all(db)


async def count_filtered(db: AsyncSession, q: str | None = None, status: str | None = None) -> int:
    """Return total count of matching job roles."""
    return await job_role_repository.count_filtered(db, q=q, status=status)


async def list_paginated_with_counts(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "name",
    sort_order: str = "asc",
    status: str | None = None,
) -> list[tuple[JobRoleOut, int, str | None, str | None]]:
    """Return paginated job roles with their project usage count and core status.

    The project count is owned by the Project aggregate: this use-case composes
    the job-role pagination (own aggregate) with a batched Project-owner count.
    """
    roles_with_status = await job_role_repository.get_paginated_with_status(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        status=status,
    )
    role_ids = [role.id for role, _, _ in roles_with_status]
    counts = await project_repository.count_by_job_role_ids(db, role_ids)
    return [
        (role, counts.get(role.id, 0), status_name, status_color)
        for role, status_name, status_color in roles_with_status
    ]


async def get_job_role_by_id(db: AsyncSession, job_role_id: int) -> JobRoleOut | None:
    """Return a single job role by ID."""
    return await job_role_repository.get_by_id(db, job_role_id)


async def create_job_role(db: AsyncSession, name: str) -> JobRoleOut:
    """Persist a new job role and return the created DTO."""
    return await job_role_repository.create(db, name)


async def update_job_role(db: AsyncSession, job_role_id: int, name: str) -> JobRoleOut | None:
    """Rename an existing job role and return the updated DTO."""
    return await job_role_repository.update(db, job_role_id, name)


async def delete_job_role(db: AsyncSession, job_role_id: int) -> None:
    """Remove a job role from the database."""
    await job_role_repository.delete(db, job_role_id)


async def confirm_job_roles(db: AsyncSession, job_role_ids: list[int]) -> int:
    """Set all pending job roles in ``job_role_ids`` to ``confirmed`` via core_statusable.

    Returns:
        Number of job roles transitioned to ``confirmed``.
    """
    active_status = await status_service.get_status_by_name_for_type(db, "active", "fbf_job_role")
    if active_status is None:
        return 0

    job_roles = await job_role_repository.get_by_ids(db, job_role_ids)
    confirmed = 0
    for job_role in job_roles:
        current = await status_service.get_status(db, "fbf_job_role", job_role.id)
        if current is None or current.status.name != "active":
            await status_service.set_status(db, "fbf_job_role", job_role.id, active_status.id)
            confirmed += 1
    await db.flush()
    return confirmed


async def list_confirmed_names(db: AsyncSession) -> list[str]:
    """Return the names of all confirmed job roles (for the classification prompt)."""
    job_roles = await job_role_repository.get_confirmed(db)
    return [jr.name for jr in job_roles]


async def get_or_create_by_name(db: AsyncSession, name: str) -> JobRoleOut:
    """Return the job role with ``name`` or create it as ``pending``.

    Safety net for the classifier: reuses an exactly matching role (any status)
    and only creates a new ``pending`` role when none exists.

    Args:
        db: Database session.
        name: Job role name.

    Returns:
        The existing or newly created job role.
    """
    existing = await job_role_repository.get_by_name(db, name)
    if existing is not None:
        return existing
    return await job_role_repository.create(db, name)


async def reassign_projects(db: AsyncSession, role_id: int, target_id: int | None) -> int:
    """Repoint all projects of ``role_id`` to ``target_id`` (or NULL).

    Args:
        db: Database session.
        role_id: Source job role whose projects are repointed.
        target_id: Target job role id, or None to clear the assignment.

    Returns:
        Number of projects updated.

    Raises:
        HTTPException 404: Source or target role not found.
    """
    source = await job_role_repository.get_by_id(db, role_id)
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job role not found")
    if target_id is not None:
        target = await job_role_repository.get_by_id(db, target_id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target job role not found")
    updated = await project_repository.reassign_job_role(db, role_id, target_id)
    await db.commit()
    return updated


async def delete_guarded(db: AsyncSession, role_id: int) -> None:
    """Delete a job role, refusing when projects still reference it.

    Args:
        db: Database session.
        role_id: Job role to delete.

    Raises:
        HTTPException 404: Job role not found.
        HTTPException 409: Job role is still referenced by projects.
    """
    job_role = await job_role_repository.get_by_id(db, role_id)
    if job_role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job role not found")
    referencing = await project_repository.count_by_job_role(db, role_id)
    if referencing > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job role is referenced by {referencing} project(s).",
        )
    await job_role_repository.delete(db, role_id)
    await db.commit()


async def reject(db: AsyncSession, role_id: int, reassign_to_id: int | None) -> None:
    """Reject a pending job role: repoint its projects, then delete it.

    Args:
        db: Database session.
        role_id: Pending job role to reject.
        reassign_to_id: Target role for its projects, or None to clear them.

    Raises:
        HTTPException 404: Job role or target not found.
        HTTPException 400: Job role is not pending.
    """
    job_role = await job_role_repository.get_by_id(db, role_id)
    if job_role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job role not found")
    current = await status_service.get_status(db, "fbf_job_role", job_role.id)
    if current is None or current.status.name != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending job roles can be rejected")
    if reassign_to_id is not None:
        target = await job_role_repository.get_by_id(db, reassign_to_id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target job role not found")
    await project_repository.reassign_job_role(db, role_id, reassign_to_id)
    await job_role_repository.delete(db, role_id)
    await db.commit()

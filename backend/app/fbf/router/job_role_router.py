"""FastAPI router for FBF job role endpoints (gjo_se_com).

Public (mounted unter /api/v1/public/fbf via router.py):
    GET /job-role            – Retrieve all job roles
Admin (mounted unter /api/v1/admin/fbf via router.py):
    GET    /job-role           – List paginated job roles (status filter)
    GET    /job-role/count     – Count job roles
    GET    /job-role/{id}      – Retrieve a single job role
    POST   /job-role           – Create job role
    PUT    /job-role/{id}      – Update job role
    DELETE /job-role/{id}      – Delete job role (409 if referenced)
    POST   /job-role/confirm   – Batch: pending → confirmed
    POST   /job-role/{id}/reassign – Repoint projects to another role / NULL
    POST   /job-role/{id}/reject   – Reject pending role: repoint + delete
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.job_role_schemas import (
    JobRoleAdminOut,
    JobRoleConfirmRequest,
    JobRoleCreate,
    JobRoleOut,
    JobRoleReassignRequest,
    JobRoleRejectRequest,
    JobRoleUpdate,
)
from app.fbf.services import job_role_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

public_router = APIRouter()
admin_router = APIRouter()


# ── Public ────────────────────────────────────────────────────────────────────


@public_router.get(
    "/job-role",
    response_model=list[JobRoleOut],
    summary="Retrieve all job roles",
)
async def list_job_roles(
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[JobRoleOut]:
    """List all job roles ordered by name."""
    job_roles = await job_role_service.list_job_roles(db)
    return [JobRoleOut.model_validate(jr) for jr in job_roles]


# ── Admin ─────────────────────────────────────────────────────────────────────


@admin_router.get(
    "/job-role",
    response_model=list[JobRoleAdminOut],
    summary="List paginated job roles (Admin)",
)
async def list_job_roles_admin(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for name"),
    status_filter: str | None = Query(default=None, alias="status", description="Curation status filter"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=5000),
    sort_by: str = Query(default="name", description="Sort field: name, status"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$", description="Sort direction"),
) -> list[JobRoleAdminOut]:
    """Returns paginated job roles (incl. project usage count) with search / filter / sort."""
    roles_with_counts = await job_role_service.list_paginated_with_counts(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        status=status_filter,
    )
    return [
        JobRoleAdminOut.model_validate(role).model_copy(
            update={
                "project_count": count,
                "status": status_name,
                "status_color_token": status_color,
            },
        )
        for role, count, status_name, status_color in roles_with_counts
    ]


@admin_router.get(
    "/job-role/count",
    summary="Count job roles (Admin)",
)
async def count_job_roles(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term"),
    status_filter: str | None = Query(default=None, alias="status", description="Curation status filter"),
) -> int:
    """Returns filtered count."""
    return await job_role_service.count_filtered(db, q=q, status=status_filter)


@admin_router.post(
    "/job-role/confirm",
    summary="Batch-confirm pending job roles (Admin)",
)
async def confirm_job_roles(
    body: JobRoleConfirmRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> int:
    """Set the given pending job roles to ``confirmed``. Returns the count changed."""
    confirmed = await job_role_service.confirm_job_roles(db, body.ids)
    await db.commit()
    return confirmed


@admin_router.get(
    "/job-role/{job_role_id}",
    response_model=JobRoleOut,
    summary="Retrieve a single job role (Admin)",
)
async def get_job_role(
    job_role_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> JobRoleOut:
    """Returns a single job role by ID."""
    job_role = await job_role_service.get_job_role_by_id(db, job_role_id)
    if not job_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job role not found")
    return JobRoleOut.model_validate(job_role)


@admin_router.post(
    "/job-role",
    response_model=JobRoleOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a job role (Admin)",
)
async def create_job_role(
    body: JobRoleCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> JobRoleOut:
    """Create a new job role. Requires admin access."""
    created = await job_role_service.create_job_role(db, body.name)
    await db.commit()
    return JobRoleOut.model_validate(created)


@admin_router.put(
    "/job-role/{job_role_id}",
    response_model=JobRoleOut,
    summary="Update a job role (Admin)",
)
async def update_job_role(
    job_role_id: int,
    body: JobRoleUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> JobRoleOut:
    """Update an existing job role by ID. Requires admin access."""
    updated = await job_role_service.update_job_role(db, job_role_id, body.name)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job role not found")
    await db.commit()
    return JobRoleOut.model_validate(updated)


@admin_router.post(
    "/job-role/{job_role_id}/reassign",
    summary="Reassign a job role's projects (Admin)",
)
async def reassign_job_role_projects(
    job_role_id: int,
    body: JobRoleReassignRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> int:
    """Repoint all projects of this role to ``target_id`` (or NULL). Returns count updated."""
    return await job_role_service.reassign_projects(db, job_role_id, body.target_id)


@admin_router.post(
    "/job-role/{job_role_id}/reject",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reject a pending job role (Admin)",
)
async def reject_job_role(
    job_role_id: int,
    body: JobRoleRejectRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Reject a pending job role: repoint its projects to ``reassign_to_id`` (or NULL), then delete."""
    await job_role_service.reject(db, job_role_id, body.reassign_to_id)


@admin_router.delete(
    "/job-role/{job_role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a job role (Admin)",
)
async def delete_job_role(
    job_role_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Delete a job role by ID. Fails with 409 if still referenced by projects."""
    await job_role_service.delete_guarded(db, job_role_id)

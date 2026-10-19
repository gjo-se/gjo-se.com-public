"""Pydantic schemas for FBF job roles (create / update / out)."""

from pydantic import BaseModel, ConfigDict, Field


class JobRoleCreate(BaseModel):
    """Request body for creating a new FBF job role.

    Der Initialstatus wird via ``core_statusable`` gesetzt (Default: pending).
    """

    name: str = Field(min_length=1, max_length=100)


class JobRoleUpdate(JobRoleCreate):
    """Request body for updating an existing FBF job role (same shape as create)."""


class JobRoleOut(BaseModel):
    """Job role data for API responses (analytic FBF job role).

    Der Status wird nicht mehr als Feld ausgegeben – er ist via
    ``core_statusable``-API abrufbar.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class JobRoleAdminOut(JobRoleOut):
    """Admin job role data including project usage count and core status."""

    project_count: int = 0
    status: str | None = None
    status_color_token: str | None = None


class JobRoleConfirmRequest(BaseModel):
    """Request body for batch-confirming pending job roles."""

    ids: list[int] = Field(min_length=1)


class JobRoleReassignRequest(BaseModel):
    """Request body for repointing a job role's projects to another role."""

    target_id: int | None = None


class JobRoleRejectRequest(BaseModel):
    """Request body for rejecting a pending job role (repoint + delete)."""

    reassign_to_id: int | None = None

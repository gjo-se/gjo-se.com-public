"""Pydantic schemas for the application CV router."""

from pydantic import BaseModel, Field


class CvPreviewRequest(BaseModel):
    """Request body for the CV preview endpoint."""

    project_id: int = Field(..., gt=0, description="Projekt-ID für den CV-Kontext")

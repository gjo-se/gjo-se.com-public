"""Pydantic schemas for polymorphic Statusable operations."""

from pydantic import BaseModel, ConfigDict


class StatusableAssignIn(BaseModel):
    """Request body for assigning a status to a statusable entity (singular)."""

    status_id: int


class StatusableOut(BaseModel):
    """Response schema for a status assignment including status metadata."""

    model_config = ConfigDict(from_attributes=True)

    status_id: int
    statusable_type: str
    statusable_id: int
    status_name: str
    status_category: str
    status_color_token: str

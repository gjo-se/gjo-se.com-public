"""Pydantic schemas for FBF importance definition API responses."""

from pydantic import BaseModel, ConfigDict, Field


class ImportanceDefinitionOut(BaseModel):
    """Response schema for an importance definition."""

    model_config = ConfigDict(from_attributes=True)

    importance: int
    label: str
    description: str


class ImportanceDefinitionUpdate(BaseModel):
    """Request body for updating an importance definition (PATCH)."""

    label: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, min_length=1, max_length=255)

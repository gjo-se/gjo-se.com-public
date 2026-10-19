"""Pydantic schemas for FBF level definition API responses."""

from pydantic import BaseModel, ConfigDict, Field


class LevelDefinitionOut(BaseModel):
    """Response schema for a level definition."""

    model_config = ConfigDict(from_attributes=True)

    level: int
    label: str
    description: str


class LevelDefinitionUpdate(BaseModel):
    """Request body for updating a level definition (PATCH)."""

    label: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, min_length=1, max_length=255)

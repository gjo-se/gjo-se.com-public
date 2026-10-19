"""Pydantic schemas for polymorphic Taggable operations."""

from pydantic import BaseModel, ConfigDict


class TaggableAssignIn(BaseModel):
    """Request body for assigning tags to a taggable entity (replaces all)."""

    tag_ids: list[int]


class TaggableOut(BaseModel):
    """Response schema for a tag assignment including tag metadata."""

    model_config = ConfigDict(from_attributes=True)

    tag_id: int
    taggable_type: str
    taggable_id: int
    tag_name: str
    tag_category: str
    tag_color_token: str


class TagUsageSummaryOut(BaseModel):
    """Summary of how a tag is used across different taggable entity types."""

    taggable_type: str
    count: int

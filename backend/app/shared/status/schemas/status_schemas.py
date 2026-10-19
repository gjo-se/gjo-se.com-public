"""Pydantic schemas for Status CRUD operations."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.shared.tagging.domain.tagging_rules import ColorToken


class StatusCreate(BaseModel):
    """Request body for creating a new core status."""

    name: str = Field(min_length=1, max_length=50)
    slug: str | None = Field(default=None, max_length=100)
    category: str = Field(min_length=1, max_length=30)
    color_token: ColorToken
    description: str | None = Field(default=None, max_length=255)
    sort_order: float = 0.0
    scope: list[str] | None = None


class StatusUpdate(BaseModel):
    """Request body for updating a core status (PATCH – only provided fields change)."""

    name: str | None = Field(default=None, min_length=1, max_length=50)
    slug: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=30)
    color_token: ColorToken | None = None
    description: str | None = Field(default=None, max_length=255)
    sort_order: float | None = None
    scope: list[str] | None = None


class StatusOut(BaseModel):
    """Response schema for a core status."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    category: str
    color_token: str
    description: str | None = None
    sort_order: float
    scope: list[str] | None = None
    usage_count: int = 0
    created_at: datetime
    updated_at: datetime

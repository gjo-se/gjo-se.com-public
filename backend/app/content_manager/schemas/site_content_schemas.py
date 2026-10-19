"""Pydantic schemas for core_site_content."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SiteContentOut(BaseModel):
    """Single site content row as returned by the admin API."""

    model_config = ConfigDict(from_attributes=True)

    key: str
    language: str
    value: str | None = None
    updated_at: datetime


class SiteContentUpdate(BaseModel):
    """Request body for updating a single site content value."""

    value: str

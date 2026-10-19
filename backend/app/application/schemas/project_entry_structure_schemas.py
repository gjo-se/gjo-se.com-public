"""Shared base schemas for the parallel project-entry blocks.

Both the career-entry and experience APIs use the translation-table pattern and
share the same sprachneutral structure fields (position, company, project_url,
start_date, end_date, sort) plus status/timestamps on read. These bases hold
ONLY the shared structure – the localized ``translations`` maps stay in the
owning schema (their value types differ per domain).
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectEntryStructureUpdate(BaseModel):
    """Shared optional structure fields for project-entry PATCH bodies."""

    model_config = ConfigDict(extra="forbid")

    position: str | None = Field(default=None, min_length=1, max_length=255)
    company: str | None = Field(default=None, max_length=255)
    project_url: str | None = Field(default=None, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    sort: int | None = None


class ProjectEntryStructureOut(BaseModel):
    """Shared serialized structure fields for project-entry responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    application_profile_id: int = Field(serialization_alias="applicationProfileId")
    position: str
    company: str | None = None
    project_url: str | None = Field(default=None, serialization_alias="projectUrl")
    start_date: date = Field(serialization_alias="startDate")
    end_date: date | None = Field(default=None, serialization_alias="endDate")
    sort: int = Field(serialization_alias="sort")
    status: str | None = None
    status_color_token: str | None = None
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

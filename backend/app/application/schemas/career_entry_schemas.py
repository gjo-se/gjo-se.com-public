"""Pydantic schemas for the career entry API – input and output bodies.

The admin write API uses the translation-table pattern: structure fields
(position, company, project_url, sort) are sprachneutral and the localized
DE/EN description is carried in ``translations`` (``dict[str, LocaleFieldsOut]``).
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.application.schemas.project_entry_structure_schemas import (
    ProjectEntryStructureOut,
    ProjectEntryStructureUpdate,
)


class CareerLocaleFieldsOut(BaseModel):
    """Localized text fields for one career entry translation (per locale)."""

    description: str | None = Field(default=None, description="Position description (Markdown)")


class CareerEntryCreate(BaseModel):
    """Request body for creating a new career entry.

    ``position`` and ``start_date`` are required. ``translations`` maps a
    locale to its localized description (``de`` recommended).
    """

    model_config = ConfigDict(extra="forbid")

    position: str = Field(..., min_length=1, max_length=255, description="Role")
    company: str | None = Field(default=None, max_length=255, description="Client/employer")
    project_url: str | None = Field(default=None, max_length=500, description="Optional proof link")
    start_date: date = Field(..., description="Start date of this position")
    end_date: date | None = Field(default=None, description="End date (None = present)")
    sort: int = 0
    translations: dict[str, CareerLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → description, 'de' empfohlen",
    )


class CareerEntryUpdate(ProjectEntryStructureUpdate):
    """Request body for partially updating a career entry.

    All structure fields are inherited (optional) – only provided fields are
    updated. When ``translations`` is provided, the existing translation rows
    are replaced with the new set (translation-table pattern).
    """

    translations: dict[str, CareerLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → description, mind. 'de' wenn gesetzt",
    )


class CareerEntryOut(ProjectEntryStructureOut):
    """Serialized career entry for API responses (camelCase keys).

    Inherits the shared project-entry structure (id, position, dates, status,
    timestamps). ``translations`` (locale → localized fields) is only populated
    in the admin path; the public path sets the flat ``description`` for the
    requested locale instead.
    """

    description: str | None = Field(default=None, serialization_alias="description")
    translations: dict[str, CareerLocaleFieldsOut] = Field(
        default_factory=dict,
        serialization_alias="translations",
    )

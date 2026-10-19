"""Pydantic schema for the public aggregated application profile response."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.application.schemas.career_entry_schemas import CareerEntryOut
from app.application.schemas.focus_area_schemas import FocusAreaOut
from app.application.schemas.profile_schemas import ProfileLocaleFieldsOut


class SkillPublicOut(BaseModel):
    """Public skill data (only name and displayed level)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    level_public: int | None = Field(default=None, serialization_alias="levelPublic")


class ProfilePublicOut(BaseModel):
    """Public whitelist of the application profile (camelCase keys).

    Excludes the sensitive sender/contact fields ``email`` and ``phone`` –
    those are admin-only (see ``ProfileOut``). ``location`` is
    public (city/country trust signal); ``available_from`` and
    ``hourly_rate`` stay admin-only and are shown as „auf Anfrage" on the
    About page instead.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str = Field(serialization_alias="fullName")
    location: str | None = Field(default=None, serialization_alias="location")
    remote: str | None = Field(default=None, serialization_alias="remote")
    languages: str | None = Field(default=None, serialization_alias="languages")
    photo_url: str | None = Field(default=None, serialization_alias="photoUrl")
    headline: str | None = Field(default=None, serialization_alias="headline")
    github_url: str | None = Field(default=None, serialization_alias="githubUrl")
    linkedin_url: str | None = Field(default=None, serialization_alias="linkedinUrl")
    translations: dict[str, ProfileLocaleFieldsOut] = Field(default_factory=dict, serialization_alias="translations")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class ProfilePublicResponse(BaseModel):
    """Aggregated public profile response for the About page.

    Includes the profile itself, active career entries, languages,
    and skills where ``level_public > 0``. ``story`` is the localized
    credibility story and ``focus_areas`` the profile's focus areas
    (flattened to the requested locale, ``de`` fallback).
    """

    profile: ProfilePublicOut
    career: list[CareerEntryOut]
    languages: list[str]
    skills: list[SkillPublicOut]
    story: str | None = None
    focus_areas: list[FocusAreaOut] = Field(default_factory=list, serialization_alias="focusAreas")

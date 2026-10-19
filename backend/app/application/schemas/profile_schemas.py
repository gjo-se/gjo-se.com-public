"""Pydantic schemas for the application profile API – input and output bodies."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProfileLocaleFieldsOut(BaseModel):
    """Localized story field for one application profile translation.

    The credibility story is an optional Markdown text with no length limit.
    """

    story: str | None = None


class ProfileCreate(BaseModel):
    """Request body for creating the singleton application profile.

    At minimum ``full_name`` is required. ``translations`` maps a locale to
    its localized ``story`` field (translation-table pattern).
    ``email``/``phone``/``location`` are the sender/contact details,
    ``website_url``/``hourly_rate``/``hourly_rate_currency``/``available_from``
    the freelance rate/availability fields. Unknown fields (e.g. the removed
    ``professional_summary``/``xing_url``) are rejected with a 422.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    email: str | None = Field(default=None, max_length=255, description="Absender-/Reply-To-E-Mail")
    phone: str | None = Field(default=None, max_length=64, description="Telefon")
    location: str | None = Field(default=None, max_length=255, description="Ort/Land (z.B. für 100 % Remote)")
    remote: str | None = Field(default=None, max_length=255, description="Remote setup (z.B. 'Remote' / 'Hybrid')")
    languages: str | None = Field(
        default=None,
        max_length=255,
        description="Kommagetrennte ISO-2-Sprachcodes (z.B. 'de, en, es')",
    )
    photo_url: str | None = Field(default=None, max_length=500, description="Profilbild (Storage-Key)")
    headline: str | None = Field(default=None, max_length=255, description="Professional headline")
    github_url: str | None = Field(default=None, max_length=500, description="GitHub profile URL")
    linkedin_url: str | None = Field(default=None, max_length=500, description="LinkedIn profile URL")
    website_url: str | None = Field(default=None, max_length=500, description="Eigene Website/Portfolio-URL")
    hourly_rate: Decimal | None = Field(default=None, description="Stundensatz")
    hourly_rate_currency: str | None = Field(default=None, max_length=3, description="Währung (Default EUR)")
    available_from: date | None = Field(default=None, description="Verfügbar ab")
    translations: dict[str, ProfileLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → Felder, mind. 'de' wenn gesetzt",
    )


class ProfileUpdate(ProfileCreate):
    """Request body for updating the application profile (same shape as create)."""


class ProfileOut(BaseModel):
    """Serialized application profile for API responses (camelCase keys)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str = Field(serialization_alias="fullName")
    remote: str | None = Field(default=None, serialization_alias="remote")
    languages: str | None = Field(default=None, serialization_alias="languages")
    photo_url: str | None = Field(default=None, serialization_alias="photoUrl")
    headline: str | None = Field(default=None, serialization_alias="headline")
    email: str | None = Field(default=None, serialization_alias="email")
    phone: str | None = Field(default=None, serialization_alias="phone")
    location: str | None = Field(default=None, serialization_alias="location")
    github_url: str | None = Field(default=None, serialization_alias="githubUrl")
    linkedin_url: str | None = Field(default=None, serialization_alias="linkedinUrl")
    website_url: str | None = Field(default=None, serialization_alias="websiteUrl")
    hourly_rate: Decimal | None = Field(default=None, serialization_alias="hourlyRate")
    hourly_rate_currency: str | None = Field(default=None, serialization_alias="hourlyRateCurrency")
    available_from: date | None = Field(default=None, serialization_alias="availableFrom")
    translations: dict[str, ProfileLocaleFieldsOut] = Field(default_factory=dict, serialization_alias="translations")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

"""Pydantic-Schemas für Application FocusArea (Fokus-Bereiche).

Create/Update/Out in einem Modul. Folgt dem Translation-Table-Muster der
Career-Entries: strukturgebende Felder (slug, url, sort) sind sprachneutral,
der lokalisierte Text wird in ``translations`` (``dict[str, LocaleFieldsOut]``)
getragen.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FocusAreaLocaleFieldsOut(BaseModel):
    """Lokalisierte Textfelder einer Fokus-Bereich-Übersetzung (pro Locale)."""

    title: str | None = Field(default=None, description="Titel des Fokus-Bereichs")
    summary: str | None = Field(default=None, description="Zusammenfassung (Markdown)")


class FocusAreaCreate(BaseModel):
    """Request-Body zum Anlegen eines Fokus-Bereichs.

    ``slug`` ist erforderlich. ``translations`` bildet eine Locale auf ihre
    lokalisierten Felder ab (``de`` empfohlen).
    """

    model_config = ConfigDict(extra="forbid")

    slug: str = Field(..., min_length=1, max_length=50, description="Eindeutiger Slug")
    url: str | None = Field(default=None, max_length=500, description="Optionaler Proof-Link")
    sort: int = 0
    translations: dict[str, FocusAreaLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → lokalisierte Felder, 'de' empfohlen",
    )


class FocusAreaUpdate(BaseModel):
    """Request-Body zum partiellen Aktualisieren eines Fokus-Bereichs.

    Alle Felder optional – nur gesetzte Felder werden aktualisiert. Wird
    ``translations`` gesetzt, werden die bestehenden Übersetzungs-Zeilen durch
    den neuen Satz ersetzt (Translation-Table-Muster).
    """

    model_config = ConfigDict(extra="forbid")

    slug: str | None = Field(default=None, min_length=1, max_length=50)
    url: str | None = Field(default=None, max_length=500)
    sort: int | None = None
    translations: dict[str, FocusAreaLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → lokalisierte Felder, mind. 'de' wenn gesetzt",
    )


class FocusAreaOut(BaseModel):
    """Serialisierter Fokus-Bereich für API-Responses (camelCase keys).

    ``translations`` (locale → lokalisierte Felder) wird nur im Admin-Pfad
    befüllt; der Public-Pfad setzt stattdessen das flache ``title``/``summary``
    für die angeforderte Locale.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    application_profile_id: int = Field(serialization_alias="applicationProfileId")
    slug: str
    url: str | None = Field(default=None, serialization_alias="url")
    sort: int = Field(serialization_alias="sort")
    title: str | None = Field(default=None, serialization_alias="title")
    summary: str | None = Field(default=None, serialization_alias="summary")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
    translations: dict[str, FocusAreaLocaleFieldsOut] = Field(
        default_factory=dict,
        serialization_alias="translations",
    )

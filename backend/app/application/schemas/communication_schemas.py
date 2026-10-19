"""Pydantic-Schemas fuer Communication (Kommunikationsverlauf).

Create/Update/Out in einem Modul. Tags laufen ueber die polymorphe
``core_taggable``-Junction und werden im Out direkt als ``TagOut``-Liste
serialisiert.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.shared.tagging.schemas.tag_schemas import TagOut


class CommunicationCreate(BaseModel):
    """Request-Body zum Anlegen eines Kommunikationseintrags."""

    model_config = ConfigDict(extra="forbid")

    application_submission_id: int | None = Field(
        default=None, description="Vorgangs-ID (Fallback; im Router-Pfad gesetzt)"
    )
    type: str = Field(default="note", max_length=20, description="Kanal (call/email/meeting/note)")
    direction: str = Field(default="outbound", max_length=20, description="Richtung")
    subject: str | None = Field(default=None, max_length=500, description="Betreff")
    summary: str | None = Field(default=None, description="Zusammenfassung / Notiz")
    outcome: str | None = Field(default=None, max_length=50, description="Ergebnis")
    next_steps: str | None = Field(default=None, description="Naechste Schritte")
    follow_up_date: datetime | None = Field(default=None, description="Wiedervorlage-Datum")
    follow_up_done: bool = Field(default=False, description="Wiedervorlage erledigt")
    sentiment: str | None = Field(default=None, max_length=20, description="Sentiment")
    tag_ids: list[int] = Field(default_factory=list, description="Tag-IDs (core_taggable)")


class CommunicationUpdate(BaseModel):
    """Request-Body zum partiellen Aktualisieren eines Kommunikationseintrags.

    Alle Felder optional, ohne ``application_submission_id`` (nicht aenderbar).
    """

    model_config = ConfigDict(extra="forbid")

    type: str | None = Field(default=None, max_length=20)
    direction: str | None = Field(default=None, max_length=20)
    subject: str | None = Field(default=None, max_length=500)
    summary: str | None = None
    outcome: str | None = Field(default=None, max_length=50)
    next_steps: str | None = None
    follow_up_date: datetime | None = None
    follow_up_done: bool | None = None
    sentiment: str | None = Field(default=None, max_length=20)
    tag_ids: list[int] | None = Field(default=None, description="Tag-IDs (ersetzt alle; None = unveraendert)")


class CommunicationOut(BaseModel):
    """Serialisierter Kommunikationseintrag fuer API-Responses (camelCase keys)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    application_submission_id: int = Field(serialization_alias="applicationSubmissionId")
    type: str
    direction: str
    subject: str | None = None
    date: datetime
    summary: str | None = None
    outcome: str | None = None
    next_steps: str | None = Field(default=None, serialization_alias="nextSteps")
    follow_up_date: datetime | None = Field(default=None, serialization_alias="followUpDate")
    follow_up_done: bool = Field(serialization_alias="followUpDone")
    sentiment: str | None = None
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
    tags: list[TagOut] = []

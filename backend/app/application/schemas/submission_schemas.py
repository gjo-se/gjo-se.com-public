"""Pydantic-Schemas fuer Submission (Bewerbungsvorgang, gjo_se_com).

Create/Update/Out in einem Modul. Die Out-Schemas serialisieren ORM-Objekte via
``from_attributes=True`` und nutzen camelCase-``serialization_alias`` fuer das FE.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.application.schemas.communication_schemas import (
    CommunicationOut,
)
from app.application.schemas.document_schemas import (
    DocumentOut,
)

#: Supported application-mail languages.
Language = Literal["de", "en"]


class SubmissionCreate(BaseModel):
    """Request-Body zum Anlegen eines Bewerbungsvorgangs.

    Die Empfaenger-/Absender-Felder sind Snapshots aus Profil und Projekt und
    werden vom Client mitgegeben.
    """

    model_config = ConfigDict(extra="forbid")

    project_id: int = Field(..., description="Projekt-ID (genau ein Vorgang je Projekt)")
    sender_profile_id: int = Field(..., description="Absenderprofil-ID")
    subject: str = Field(..., max_length=500, description="Betreff der Bewerbung")
    body: str = Field(..., description="Anschreiben / Mail-Text (Plain-Text)")
    sender_email: str = Field(..., max_length=255, description="Absender-Adresse (Snapshot)")
    reply_to_email: str | None = Field(default=None, max_length=255, description="Reply-To-Adresse")
    recipient_email: str = Field(..., max_length=255, description="Empfaenger-Adresse")
    recipient_display_name: str | None = Field(default=None, max_length=255, description="Anzeigename des Empfaengers")
    recipient_company_name: str | None = Field(default=None, max_length=255, description="Firmenname des Empfaengers")


class SubmissionOut(BaseModel):
    """Serialisierter Bewerbungsvorgang fuer API-Responses (camelCase keys)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int = Field(serialization_alias="projectId")
    sender_profile_id: int = Field(serialization_alias="senderProfileId")
    subject: str
    body: str
    language: Language
    sender_email: str = Field(serialization_alias="senderEmail")
    reply_to_email: str | None = Field(default=None, serialization_alias="replyToEmail")
    recipient_email: str = Field(serialization_alias="recipientEmail")
    recipient_display_name: str | None = Field(default=None, serialization_alias="recipientDisplayName")
    recipient_company_name: str | None = Field(default=None, serialization_alias="recipientCompanyName")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class PrepareRequest(BaseModel):
    """Request-Body zum Vorbereiten eines Bewerbungsvorgangs."""

    model_config = ConfigDict(extra="forbid")

    project_id: int = Field(..., gt=0, description="Projekt-ID, für die ein Vorgang vorbereitet wird")
    language: Language = Field(default="de", description="Sprache der Bewerbungs-Mail (de/en)")


class StatusOut(BaseModel):
    """Serialisierter Status eines Bewerbungsvorgangs (camelCase keys).

    Serialisiert direkt ein ``Status``-Objekt (via ``from_attributes``).
    """

    model_config = ConfigDict(from_attributes=True)

    name: str
    slug: str
    category: str
    color_token: str = Field(serialization_alias="colorToken")


class SubmissionRecipientSnapshotOut(BaseModel):
    """Shared recipient snapshot + status/timestamps for list/detail responses."""

    model_config = ConfigDict(from_attributes=True)

    recipient_email: str = Field(serialization_alias="recipientEmail")
    recipient_display_name: str | None = Field(default=None, serialization_alias="recipientDisplayName")
    recipient_company_name: str | None = Field(default=None, serialization_alias="recipientCompanyName")
    recipient_person_id: int | None = Field(default=None, serialization_alias="recipientPersonId")
    recipient_company_id: int | None = Field(default=None, serialization_alias="recipientCompanyId")
    is_current: bool = Field(default=False, serialization_alias="isCurrent")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
    status: StatusOut | None = None


class SubmissionStatusUpdate(BaseModel):
    """Request-Body zum Setzen des Vorgangs-Status."""

    model_config = ConfigDict(extra="forbid")

    status: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Ziel-Statusname (z. B. replied, interview, rejected, withdrawn)",
    )


class SubmissionListOut(SubmissionRecipientSnapshotOut):
    """Reduziertes Response-Schema fuer die Vorgangs-Tabelle (camelCase keys).

    Enthaelt nur die Spalten der Bewerbungs-Uebersicht (Projekt, Betreff,
    Empfaenger, Status, Datum). ``project_title`` und ``status`` werden vom
    Service nach ``model_validate`` befuellt.
    """

    id: int
    project_id: int = Field(serialization_alias="projectId")
    project_title: str | None = Field(default=None, serialization_alias="projectTitle")
    project_title_normalized: str | None = Field(default=None, serialization_alias="projectTitleNormalized")
    subject: str
    language: Language
    last_score: float | None = Field(
        default=None, serialization_alias="lastScore", description="Gesamtscore des letzten Runs (0–100)."
    )
    last_verdict: str | None = Field(
        default=None, serialization_alias="lastVerdict", description="Verdict des letzten Runs."
    )
    last_scored_at: datetime | None = Field(
        default=None, serialization_alias="lastScoredAt", description="Zeitpunkt des letzten Runs."
    )


class SubmissionDetailOut(SubmissionRecipientSnapshotOut):
    """Serialisierter Bewerbungsvorgang mit Status, Dokumenten und Verlauf.

    Erweitert den Empfänger-/Status-Block um Absender-/Body-Felder und die
    verschachtelten ORM-Relationships ``documents`` und ``communications``
    (via ``from_attributes``).
    """

    id: int
    project_id: int = Field(serialization_alias="projectId")
    project_title: str | None = Field(default=None, serialization_alias="projectTitle")
    sender_profile_id: int = Field(serialization_alias="senderProfileId")
    subject: str
    body: str
    language: Language
    sender_email: str = Field(serialization_alias="senderEmail")
    reply_to_email: str | None = Field(default=None, serialization_alias="replyToEmail")
    documents: list[DocumentOut] = []
    communications: list[CommunicationOut] = []

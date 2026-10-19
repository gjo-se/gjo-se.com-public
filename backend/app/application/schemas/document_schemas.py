"""Pydantic-Schemas fuer Document (generiertes Bewerbungsdokument).

Create/Out in einem Modul. ``storage_key`` ist die SSOT fuer das
Object-Storage-Objekt; die Out-Serialisierung nutzt camelCase-Aliase.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DocumentCreate(BaseModel):
    """Request-Body zum Anlegen eines generierten Bewerbungsdokuments."""

    model_config = ConfigDict(extra="forbid")

    kind: str = Field(default="cv", max_length=20, description="Dokumentart (cv)")
    storage_key: str = Field(..., max_length=500, description="Object-Storage-Key (SSOT)")
    filename: str = Field(..., max_length=255, description="Dateiname fuer den Download")
    mime_type: str = Field(..., max_length=100, description="MIME-Typ der Datei")
    size_bytes: int = Field(..., description="Dateigroesse in Bytes")
    checksum_sha256: str = Field(..., max_length=64, description="SHA-256-Pruefsumme")
    render_context: dict[str, Any] | None = Field(
        default=None, description="Eingabekontext der Rendering-Pipeline (JSONB)"
    )


class CvSkillAddItemIn(BaseModel):
    """Ein hinzuzufuegender CV-Skill (nur der Name; die Zuordnung zum Master
    inkl. Gruppe/Level/Importance steuert die Dedup-Pipeline, nicht der Caller)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=100, description="Skill-Name (fbf_skill)")


class CvSkillAddRequest(BaseModel):
    """Request-Body fuer den Batch-Add von CV-Skills (mindestens ein Item)."""

    model_config = ConfigDict(extra="forbid")

    items: list[CvSkillAddItemIn] = Field(
        ..., min_length=1, description="Hinzuzufuegende Skills (dedupliziert verarbeitet)"
    )


class CvSkillExcludeRequest(BaseModel):
    """Request-Body: einen Skill aus dem CV ausschliessen (per Name)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=100, description="Skill-Name (fbf_skill)")


class CvRegenerateRequest(BaseModel):
    """Request-Body fuer das manuelle Re-Render des CV.

    ``use_default_skills`` schaltet die gruppierte Skill-Sektion von den
    projektspezifischen Skills (``project_skill``) auf die kuratierten
    Default-Skills (analog der projektlosen CV, ``_load_site_skill_groups``)
    um. Ohne Body/``null`` erbt das Re-Render den zuletzt am CV-Snapshot
    gespeicherten Modus.
    """

    model_config = ConfigDict(extra="forbid")

    use_default_skills: bool = Field(default=False, description="Default-Skills statt Projekt-Skills rendern")


class DocumentOut(BaseModel):
    """Serialisiertes Bewerbungsdokument fuer API-Responses (camelCase keys)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    application_submission_id: int = Field(serialization_alias="applicationSubmissionId")
    kind: str
    storage_key: str = Field(serialization_alias="storageKey")
    filename: str
    mime_type: str = Field(serialization_alias="mimeType")
    size_bytes: int = Field(serialization_alias="sizeBytes")
    checksum_sha256: str = Field(serialization_alias="checksumSha256")
    render_context: dict[str, Any] | None = Field(default=None, serialization_alias="renderContext")
    generated_at: datetime = Field(serialization_alias="generatedAt")
    created_at: datetime = Field(serialization_alias="createdAt")

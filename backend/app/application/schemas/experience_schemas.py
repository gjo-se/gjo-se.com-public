"""Pydantic schemas for the application experience API – input and output bodies.

The admin write API uses the translation-table pattern: structure fields
(position, company, project_url, start_date, end_date, sort) are
sprachneutral and the localized text blocks are carried in ``translations``
(``dict[str, ExperienceLocaleFieldsOut]``). Child lists ``decisions`` and
``proofs`` each carry their own ``translations`` map.

Every text block lives in its own field (no markdown blob) – this is the SSOT
for the Pydantic→Zod constraint pipeline and the CV context builders.
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.application.schemas.project_entry_structure_schemas import (
    ProjectEntryStructureOut,
    ProjectEntryStructureUpdate,
)


class ExperienceLocaleFieldsOut(BaseModel):
    """Localized text blocks for one experience translation (per locale)."""

    context: str | None = Field(default=None, description="Einordnung/Kontext")
    outcome: str | None = Field(default=None, description="Ergebnis/Impact")
    problem: str | None = Field(default=None, description="Problemstellung")
    scope: str | None = Field(default=None, description="Umfang/Scope")
    solution_what: str | None = Field(default=None, description="Lösung WAS")
    tech_stack: str | None = Field(
        default=None,
        max_length=255,
        description="Kurztext, komma-separierte Tech-Liste",
    )
    evidence: str | None = Field(default=None, description="Belege/Nachweise")


class DecisionLocaleFieldsOut(BaseModel):
    """Localized title/body for one decision (``Lösung WIE``, per locale)."""

    title: str | None = Field(default=None, max_length=255, description="Entscheidung")
    body: str | None = Field(default=None, description="Begründung")
    discarded: str | None = Field(default=None, description="Verworfene Alternative")


class ProofLocaleFieldsOut(BaseModel):
    """Localized text for one proof bullet (per locale)."""

    text: str | None = Field(default=None, description="Proof-Text")


class DecisionIn(BaseModel):
    """One decision bullet (``Lösung WIE``) within a create/update request."""

    model_config = ConfigDict(extra="forbid")

    sort: int = 0
    translations: dict[str, DecisionLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → title/body/discarded, 'de' empfohlen",
    )


class ProofIn(BaseModel):
    """One proof bullet within a create/update request."""

    model_config = ConfigDict(extra="forbid")

    sort: int = 0
    translations: dict[str, ProofLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → text, 'de' empfohlen",
    )


class ExperienceCreate(BaseModel):
    """Request body for creating a new experience project.

    ``position`` and ``start_date`` are required. ``translations`` maps a
    locale to its localized text blocks (``de`` recommended). ``decisions``
    and ``proofs`` carry ordered child lists, each with their own
    ``translations`` map.
    """

    model_config = ConfigDict(extra="forbid")

    position: str = Field(..., min_length=1, max_length=255, description="Rolle")
    company: str | None = Field(
        default=None,
        max_length=255,
        description="Internes Quell-/Agentur-Feld – nie rendern",
    )
    project_url: str | None = Field(default=None, max_length=500, description="Optionaler Proof-Link")
    start_date: date = Field(..., description="Startdatum des Projekts")
    end_date: date | None = Field(default=None, description="Enddatum (None = laufend)")
    sort: int = 0
    translations: dict[str, ExperienceLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → Textblöcke, 'de' empfohlen",
    )
    decisions: list[DecisionIn] = []
    proofs: list[ProofIn] = []


class ExperienceUpdate(ProjectEntryStructureUpdate):
    """Request body for partially updating an experience project.

    Structure fields are inherited (optional) – only provided fields are
    updated. When ``translations``, ``decisions`` or ``proofs`` are provided,
    the existing rows are replaced with the new set (translation-table pattern).
    """

    translations: dict[str, ExperienceLocaleFieldsOut] | None = Field(
        default=None,
        description="locale → Textblöcke, ersetzt bestehende Zeilen",
    )
    decisions: list[DecisionIn] | None = Field(
        default=None,
        description="Ersetzt bestehende Entscheidungen wenn gesetzt",
    )
    proofs: list[ProofIn] | None = Field(
        default=None,
        description="Ersetzt bestehende Proofs wenn gesetzt",
    )


class DecisionOut(BaseModel):
    """Serialized decision bullet (structure + localized fields)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    sort: int
    translations: dict[str, DecisionLocaleFieldsOut] = Field(
        default_factory=dict,
        serialization_alias="translations",
    )


class ProofOut(BaseModel):
    """Serialized proof bullet (structure + localized fields)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    sort: int
    translations: dict[str, ProofLocaleFieldsOut] = Field(
        default_factory=dict,
        serialization_alias="translations",
    )


class ExperienceOut(ProjectEntryStructureOut):
    """Serialized experience project for API responses (camelCase keys).

    Inherits the shared project-entry structure (id, position, dates, status,
    timestamps) and carries ``translations`` (locale → text blocks) plus the
    ordered child lists ``decisions``/``proofs``. The CV context builder
    derives its output from ``translations`` itself – no flat convenience
    fields are provided here.

    ``company`` is internal-only and MUST NEVER be rendered in the CV, public
    API or freelancermap exports.
    """

    translations: dict[str, ExperienceLocaleFieldsOut] = Field(
        default_factory=dict,
        serialization_alias="translations",
    )
    decisions: list[DecisionOut] = Field(
        default_factory=list,
        serialization_alias="decisions",
    )
    proofs: list[ProofOut] = Field(
        default_factory=list,
        serialization_alias="proofs",
    )

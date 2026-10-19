"""Pydantic-Schemas fuer die Score-Admin-API (Bewerbungs-Score, gjo_se_com).

Request + Response in einem Modul. Die Out-Schemas serialisieren ORM-Objekte via
``from_attributes=True`` und nutzen camelCase-``serialization_alias`` fuer das FE.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class RequirementOut(BaseModel):
    """Eine Anforderung aus der Ausschreibung."""

    text: str = Field(description="Anforderung aus der Ausschreibung (Muss- oder Kann-Kriterium).")
    kind: Literal["must", "nice"] = Field(description="must = Pflichtanforderung, nice = wünschenswert.")
    covered: bool | None = Field(
        default=None,
        description="True, wenn das Bewerbungspaket/CV die Anforderung belegt; None = nicht bewertbar.",
    )
    cv_evidence: str | None = Field(default=None, description="CV-Stelle/Beleg zur Anforderung.")


class ScoreStartRequest(BaseModel):
    """Request-Body zum Starten eines Score-Laufs.

    Es ist genau eines von ``project_id`` oder ``submission_id`` erforderlich;
    optional kann ein ``description_override`` mitgegeben werden.
    """

    model_config = ConfigDict(extra="forbid")

    project_id: int | None = Field(default=None, gt=0, description="Projekt-ID (alternativ zu submission_id).")
    submission_id: int | None = Field(default=None, gt=0, description="Vorgangs-ID (alternativ zu project_id).")
    description_override: str | None = Field(
        default=None,
        max_length=20000,
        description="Ausschreibungstext-Override für Projekte ohne description.",
    )

    @model_validator(mode="after")
    def _validate_source(self) -> ScoreStartRequest:
        """Erzwingt genau eines von ``project_id``/``submission_id``."""
        if (self.project_id is None) == (self.submission_id is None):
            raise ValueError("Genau eines von project_id oder submission_id ist erforderlich.")
        return self


class ScoreCriterionOut(BaseModel):
    """Serialisierte Kriterium-Zeile eines Score-Laufs (camelCase keys)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    criterion_key: str = Field(serialization_alias="criterionKey")
    group_key: str = Field(serialization_alias="groupKey")
    value: float | None = Field(default=None, description="Bewertung 0–1; null = Datenlücke.")
    weight: int
    reason: str | None = None
    evidence: str | None = None
    action: str | None = None


class ScoreGroupOut(BaseModel):
    """Abgeleitetes Aggregat je Gruppe (nicht persistiert)."""

    group: str = Field(description="Gruppen-Key (inhalt/form/rahmen).")
    score: float = Field(description="Erreichte Punkte der Gruppe (Σ value×weight, 2 Nachkommastellen).")
    weight: int = Field(description="Summe der Kanon-Gewichte der Gruppe.")
    assessed_weight: int = Field(description="Σ Gewicht der Gruppe mit value≠NULL (Coverage).")


class ScoreRunOut(BaseModel):
    """Vollstaendiges Run-Detail eines Score-Laufs (camelCase keys).

    Die abgeleiteten Felder ``groups``, ``assessed_weight``, ``missing_keys``,
    ``is_lower_bound``, ``normalized_score`` und ``is_conclusive`` werden vom
    Service befuellt (nicht persistiert).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    application_submission_id: int = Field(serialization_alias="applicationSubmissionId")
    project_id: int = Field(serialization_alias="projectId")
    weights_version: str = Field(serialization_alias="weightsVersion")
    total_score: float | None = Field(default=None, serialization_alias="totalScore")
    verdict: Literal["ready", "borderline", "weak"] | None = None
    llm_call_log_id: int | None = Field(default=None, serialization_alias="llmCallLogId")
    created_at: datetime = Field(serialization_alias="createdAt")
    completed_at: datetime | None = Field(default=None, serialization_alias="completedAt")
    requirements: list[RequirementOut] = Field(
        default_factory=list, description="Extrahierte Anforderungen (Muss/Kann)."
    )
    criteria: list[ScoreCriterionOut] = Field(default_factory=list, description="Alle 11 Kriterium-Zeilen.")
    groups: list[ScoreGroupOut] = Field(default_factory=list, description="Aggregat je Gruppe (abgeleitet).")
    assessed_weight: int = Field(default=0, description="Σ Gewicht der Kriterien mit value≠NULL (Coverage).")
    missing_keys: list[str] = Field(default_factory=list, description="Kanon-Keys ohne Wert (value=NULL).")
    is_lower_bound: bool = Field(
        default=False,
        description="True wenn assessed_weight < 100 → total_score ist eine untere Schranke.",
    )
    normalized_score: float | None = Field(
        default=None,
        serialization_alias="normalizedScore",
        description="Güte auf bewerteter Basis (total_score / assessed_weight × 100).",
    )
    is_conclusive: bool = Field(
        default=False,
        serialization_alias="isConclusive",
        description="True wenn assessed_weight ≥ 70 → verdict ist belastbar.",
    )

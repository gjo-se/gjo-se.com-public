"""Output-Schemas fuer die Endkunden-Recherche LLM-Tasks (Epic 12).

Enthaelt die strukturierten Output-Typen fuer:
  - ``endcustomer-extraction`` → ``EndcustomerSignalsOut``
  - ``endcustomer-dedup-evaluation`` → ``EndcustomerDedupEvaluationOut``
  - ``endcustomer-evaluation`` → ``EndcustomerEvaluationOut``
  - ``endcustomer-fusion`` → ``EndcustomerFusionResultOut``
  - Pipeline-Testing → ``PipelineActResultOut``, ``PipelineResultResponse``
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.fbf.models.project_endcustomer_candidate import (
    EndcustomerCandidateSource,
)

# Re-use des existierenden StrEnum – kein Duplikat.
EndcustomerSource = EndcustomerCandidateSource


class EndcustomerSignalsOut(BaseModel):
    """Strukturierte Signale aus der Projektbeschreibung (endcustomer-extraction).

    Attributes:
        company_hints: Gefundene Firmen-Hinweise in der Beschreibung.
        product_hints: Hinweise auf Produkte/Dienstleistungen.
        unique_phrases: Markante, eindeutig identifizierbare Phrasen.
        tech_stack_summary: Zusammenfassung der genannten Technologien.
        project_context: Kurzer Projekt-Kontext (Rolle, Branche, Standort).
    """

    company_hints: list[str] = Field(default_factory=list)
    product_hints: list[str] = Field(default_factory=list)
    unique_phrases: list[str] = Field(default_factory=list)
    tech_stack_summary: str = Field(default="")
    project_context: str = Field(default="")


class EndcustomerDedupEvaluationOut(BaseModel):
    """Evaluierte Cross-Reference-Hinweise aus Cousin-Beschreibungen.

    Attributes:
        company_hints: Extrahierte Firmennamen aus Cousin-Beschreibungen.
        department_hints: Hinweise auf Abteilungen/Bereiche.
        extracted_evidence: Konkrete Belegstellen (Zitate).
        confidence_per_cousin: Cousin-URL → Confidence (0..1).
        overall_confidence: Gesamt-Vertrauen in die Dedup-Evaluation (0..1).
    """

    company_hints: list[str] = Field(default_factory=list)
    department_hints: list[str] = Field(default_factory=list)
    extracted_evidence: list[str] = Field(default_factory=list)
    confidence_per_cousin: dict[str, float] = Field(default_factory=dict)
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class EndcustomerEvaluationOut(BaseModel):
    """LLM-Bewertung eines einzelnen Endkunden-Kandidaten (endcustomer-evaluation).

    Act 7 in der Pipeline: Bewertet Zielseiten-Text + Vector-Similarity
    gegen die extrahierten Projekt-Signale.

    Attributes:
        confidence: Confidence-Score fuer diesen Kandidaten (0.0–1.0).
        reasoning: Begruendung der LLM-Entscheidung.
    """

    confidence: float = Field(ge=0, le=1, description="Confidence score for this candidate")
    reasoning: str = Field(description="LLM reasoning for the confidence score")


class EndcustomerCandidateOut(BaseModel):
    """Ein einzelner Fusions-Kandidat (verschachtelt in EndcustomerFusionResultOut).

    Kein DB-Model – reines LLM-Output-Transfer-Objekt.
    """

    company_name: str
    website: str | None = None
    career_page_url: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source: EndcustomerSource
    reasoning: str = Field(default="")


class EndcustomerFusionResultOut(BaseModel):
    """Ergebnis der Treffer-Fusion (endcustomer-fusion).

    Attributes:
        candidates: Fusionierte, deduplizierte Kandidatenliste.
    """

    candidates: list[EndcustomerCandidateOut] = Field(default_factory=list)


# ── Pipeline Testing Schemas ────────────────────────────────────────────────────


class PipelineActResultOut(BaseModel):
    """Per-Act result from the endcustomer research pipeline.

    Returned by the workflow when ``stop_after_act`` is set.  Each act
    contributes one entry to ``PipelineResultResponse.acts``.
    """

    act: int = Field(ge=1, le=8, description="Act number (1-8).")
    name: str = Field(description="Human-readable act name.")
    status: Literal["done", "failed", "skipped"] = Field(
        description="Execution status of this act.",
    )
    duration_ms: int | None = Field(default=None, description="Wall-clock duration in ms.")
    summary: str = Field(default="", description="One-line summary for collapsed state.")
    data: dict[str, Any] = Field(
        default_factory=dict, description="Act-specific structured data (signals, candidates, etc.)."
    )
    call_log_id: int | None = Field(default=None, description="Link to llm_call_log row.")
    error: str | None = Field(default=None, description="Error detail if status='failed'.")


class PipelineResultResponse(BaseModel):
    """Workflow completion result for partial or full pipeline execution.

    The ``phase`` field indicates whether the pipeline stopped early
    (``"stopped"``), ran to completion (``"done"``), or failed.
    """

    project_id: int = Field(description="Project that was researched.")
    phase: str = Field(description="'running' | 'stopped' | 'done' | 'failed'.")
    stopped_at_act: int | None = Field(
        default=None,
        description="Act number where the pipeline stopped (only when phase='stopped').",
    )
    acts: dict[str, PipelineActResultOut] = Field(
        default_factory=dict,
        description="Per-act results keyed by act number string ('1'..'8').",
    )
    candidates_fused: int | None = Field(
        default=None,
        description="Final candidate count after fusion (only when phase='done').",
    )

"""LLM enrichment schemas for the scan-code-enrich task.

Pydantic models that define the structured output of the LLM enrichment
step. The LLM receives architecture objects with ``source: "catalog"``
(template descriptions) and returns them enriched with domain-specific
context.

The module also contains the L3 component-summary schemas
(``ComponentSummaryItemOut`` / ``ComponentSummaryOut``) used to aggregate
module docstrings into a concise component description.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class EnrichedObjectOut(BaseModel):
    """A single architecture object enriched by the LLM."""

    id: str = Field(description="Dot-separated object ID (e.g. 'backend.fastapi')")
    description: str | None = Field(
        default=None,
        description="Enriched description – only set when source was 'catalog' and the LLM improved it",
    )
    edge_label: str | None = Field(
        default=None,
        description="Enriched edge label – only set when the LLM improved it",
    )


class ScanCodeEnrichOut(BaseModel):
    """Structured output of the scan-code-enrich LLM task.

    Contains the enriched architecture objects with improved descriptions
    and edge labels.
    """

    objects: list[EnrichedObjectOut] = Field(
        default_factory=list,
        description="Architecture objects with enriched descriptions and edge labels",
    )


class ComponentSummaryItemOut(BaseModel):
    """Eine L3-Component mit LLM-generierter Kurzbeschreibung."""

    id: str = Field(description="Component-ID (= top_level Feature-Pfad, z. B. 'app.fbf')")
    description: str = Field(description="Prägnante fachliche Beschreibung (max. 2 Sätze)")


class ComponentSummaryOut(BaseModel):
    """Structured output des component-summary LLM-Tasks."""

    components: list[ComponentSummaryItemOut] = Field(
        default_factory=list,
        description="Components mit aus den Modul-Docstrings zusammengefasster Beschreibung",
    )

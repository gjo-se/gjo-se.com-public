"""Architecture API schemas.

Pydantic models for the architecture object update endpoint.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ObjectFieldUpdateRequest(BaseModel):
    """Request to update a single field of an architecture model object."""

    field: str = Field(..., min_length=1, description="Field name to update (e.g. 'name', 'description', 'status')")
    value: Any = Field(..., description="New value for the field (string, boolean, array, or object)")


class ObjectFieldUpdateResponse(BaseModel):
    """Response after a successful field update."""

    success: bool = Field(..., description="Whether the update was successful")
    object: dict[str, Any] = Field(..., description="The updated object as a dictionary")


class ObjectMergeRequest(BaseModel):
    """Request to merge a SOLL object into the corresponding IST object."""

    merged: dict[str, Any] = Field(..., description="The fully merged object to write into the IST YAML file")


class ObjectMergeResponse(BaseModel):
    """Response after a successful merge operation."""

    success: bool = Field(..., description="Whether the merge was successful")
    object: dict[str, Any] = Field(..., description="The merged and saved object as a dictionary")


# ── Scan Meta ────────────────────────────────────────────────────────────────


class TechnologyCandidateOut(BaseModel):
    """A technology suggestion from the scanner – not yet confirmed in the catalog.

    The catalog is the single source of truth for technology values.
    Candidates are UI hints that a human can accept (mapping to a catalog slug)
    or reject.
    """

    slug: str = Field(..., description="Catalog slug suggestion (e.g. 'fastapi', 'react').")
    name: str = Field(..., description="Human-readable technology name (e.g. 'FastAPI', 'React').")
    source: str = Field(..., description="Origin of the suggestion (e.g. 'llm', 'parser').")


class ScanMetaOut(BaseModel):
    """Metadata from the last scan run – UI hints and source tracking.

    Tracks which source (parser/catalog/llm) contributed each field
    and when the last scan was executed.
    """

    last_scan_at: datetime | None = Field(default=None, description="Timestamp der letzten Scan-Ausführung")
    sources: dict[str, str] = Field(default_factory=dict, description="Feldname → Source-Typ (parser/catalog/llm)")
    technology_candidates: list[TechnologyCandidateOut] | None = Field(
        default=None,
        description="Technology suggestions from the scanner (catalog slugs, not direct assignments).",
    )


# ── Scan-Code Normalize (LLM structured output) ──────────────────────────────


class ArchitectureContainerOut(BaseModel):
    """A container (deployable unit) discovered by code analysis."""

    id: str = Field(..., description="Dot-separated container ID (e.g. 'backend.fastapi').")
    name: str = Field(..., description="Human-readable container name.")
    type: str = Field(
        ...,
        description="Object type: container (own runtime/Docker service) or component (library/SDK/module).",
    )
    description: str = Field(default="", description="What this container does.")
    tags: list[str] = Field(default_factory=list)
    scan_meta: ScanMetaOut | None = Field(
        default=None, alias="scan_meta", description="Scan-Metadaten (UI-Hints, Source-Tracking)"
    )


# ── Merge Result ──────────────────────────────────────────────────────────


# ── Create Object / Edge ────────────────────────────────────────────────────


class CreateObjectRequest(BaseModel):
    """Request to create a new architecture object."""

    id: str = Field(..., min_length=1, description="Dot-separated object ID")
    name: str = Field(..., min_length=1, description="Human-readable object name")
    type: str | None = Field(default=None, description="Object type: System, Container, Component")
    description: str | None = Field(default=None, description="What this object does")
    technologies: list[str] = Field(default_factory=list, description="Technology catalog slugs")
    tags: list[str] = Field(default_factory=list, description="Categorization tags")
    parent: str | None = Field(default=None, description="Parent system ID for containers")


class CreateEdgeRequest(BaseModel):
    """Request to create a new edge between two architecture objects."""

    from_id: str = Field(..., min_length=1, description="Source object ID")
    to_id: str = Field(..., min_length=1, description="Target object ID")
    description: str | None = Field(default=None, description="Nature of the edge")
    technology: str | None = Field(default=None, description="Protocol or technology used")
    tags: list[str] = Field(default_factory=list, description="Categorization tags")
    scan_meta: ScanMetaOut | None = Field(default=None, description="Scan-Metadaten")
    status: str | None = Field(default=None, description="Status (viscera-*)")


class UpdateEdgeRequest(BaseModel):
    """Request to update editable fields of an edge."""

    description: str | None = Field(default=None, description="Nature of the edge")
    technology: str | None = Field(default=None, description="Protocol or technology used")
    tags: list[str] | None = Field(default=None, description="Categorization tags")


class EdgeOut(BaseModel):
    """An edge between two architecture objects (API response)."""

    from_id: str = Field(..., serialization_alias="from", description="Source object ID")
    to_id: str = Field(..., serialization_alias="to", description="Target object ID")
    description: str | None = Field(default=None, description="Nature of the edge")
    technology: str | None = Field(default=None, description="Protocol or technology used")
    tags: list[str] = Field(default_factory=list, description="Categorization tags")
    scan_meta: ScanMetaOut | None = Field(default=None, description="Scan-Metadaten")
    status: str | None = Field(default=None, description="Status (viscera-*)")

    model_config = {"populate_by_name": True}


class CreateObjectResponse(BaseModel):
    """Response after successfully creating an architecture object."""

    success: bool = Field(..., description="Whether the create was successful")
    object: dict[str, Any] = Field(..., description="The created object as a dictionary")


class CreateEdgeResponse(BaseModel):
    """Response after successfully creating an edge."""

    success: bool = Field(..., description="Whether the create was successful")
    edge: dict[str, Any] = Field(..., description="The created edge as a dictionary")


class ObjectListResponse(BaseModel):
    """Response for the list-all-objects endpoint."""

    objects: list[dict[str, Any]] = Field(
        default_factory=list, description="All architecture nodes from nodes/ directory"
    )


# ── Merge Result ──────────────────────────────────────────────────────────


# ── Diagram CRUD ──────────────────────────────────────────────────────────


class DiagramResponse(BaseModel):
    """Response schema for a single diagram entity."""

    key: str = Field(..., description="Unique diagram key (filename without .yml)")
    name: str = Field(..., description="Human-readable diagram name")
    type: str = Field(..., description="Diagram type: systemContext, container, component, dynamic, deployment")
    description: str = Field(default="", description="What this diagram shows")
    parent: str | None = Field(default=None, description="Parent system ID for container diagrams")
    base: str | None = Field(default=None, description="Database base: app (ER-Membership, INC 4)")
    layout: str | None = Field(default=None, description="Layout direction: lr, tb, rl, bt")
    nodes: dict[str, dict[str, Any]] = Field(
        default_factory=dict,
        description="Node positions: {nodeId: {x, y}, ...}. Replaces the legacy layout/ dir.",
    )
    status: str = Field(
        default="viscera-approved",
        description=("Status (viscera-approved/-pending/-planned/-scan_missing/-deprecated/-rejected)"),
    )
    scan_meta: dict[str, Any] | None = Field(
        default=None, description="Scan-Metadaten (UI-Hints, Source-Tracking). None = user-created."
    )
    source: str = Field(
        default="code",
        description="Origin of the diagram: 'code' (live/scanned) or 'golden' (golden sub-world). Default: 'code'.",
    )


class CreateDiagramRequest(BaseModel):
    """Request to create a new diagram."""

    key: str = Field(..., min_length=1, pattern=r"^[A-Za-z0-9_-]+$", description="Unique diagram key")
    name: str = Field(..., min_length=1, description="Human-readable diagram name")
    type: str = Field(..., min_length=1, description="Diagram type")
    description: str | None = Field(default=None, description="What this diagram shows")
    parent: str | None = Field(default=None, description="Parent system ID for container diagrams")
    base: str | None = Field(default=None, description="Database base: app (ER-Membership, INC 4)")
    layout: str | None = Field(default=None, description="Layout direction")
    nodes: dict[str, dict[str, Any]] | None = Field(
        default=None, description="Initial node positions: {nodeId: {x, y}, ...}"
    )
    status: str | None = Field(default=None, description="Status (viscera-*). Default: viscera-approved")
    scan_meta: ScanMetaOut | None = Field(default=None, description="Scan-Metadaten (UI-Hints, Source-Tracking)")
    source: str = Field(
        default="code",
        description=(
            "Origin of the diagram: 'code' (live/scanned) or 'golden' "
            "(golden sub-world). Persisted as YAML field on create. Default: 'code'."
        ),
    )


class UpdateDiagramRequest(BaseModel):
    """Request to update a diagram's metadata fields.

    All fields are optional — only non-None values are applied.
    """

    name: str | None = Field(default=None, description="Human-readable diagram name")
    description: str | None = Field(default=None, description="What this diagram shows")
    type: str | None = Field(default=None, description="Diagram type (e.g. systemContext, container)")
    layout: str | None = Field(default=None, description="Layout direction: lr, tb, rl, bt")
    parent: str | None = Field(default=None, description="Parent system ID for container/component diagrams")
    base: str | None = Field(default=None, description="Database base: app (ER-Membership, INC 4)")
    status: str | None = Field(default=None, description="Status (z.B. 'viscera-approved' für Accept)")
    source: str = Field(
        default="code",
        description=(
            "Origin of the diagram: 'code' or 'golden'. Read-only after create — "
            "not applied on update (provenance is immutable). Default: 'code'."
        ),
    )


class UpdateDiagramNodesRequest(BaseModel):
    """Request to set the position of a single node within a diagram.

    ``width``/``height`` are optional node bounds (group boundaries, #2292),
    ``description`` is an optional curated node description (L4 file nodes,
    LLM-ready).
    """

    x: float = Field(..., description="X coordinate of the node position")
    y: float = Field(..., description="Y coordinate of the node position")
    width: float | None = Field(default=None, description="Optional node width (bounds)")
    height: float | None = Field(default=None, description="Optional node height (bounds)")
    description: str | None = Field(
        default=None,
        description="Optionale kuratierte Node-Description (L4-Datei-Nodes, LLM-ready)",
    )


class BatchUpdateDiagramNodesRequest(BaseModel):
    """Request to batch-update all node positions within a diagram (#2232)."""

    nodes: dict[str, dict[str, Any]] = Field(
        default_factory=dict,
        description="Node positions: {nodeId: {x, y}, ...}. Empty map clears all positions.",
    )


# ── Group CRUD ──────────────────────────────────────────────────────────


class GroupResponse(BaseModel):
    """Response schema for a single group entity."""

    id: str = Field(..., description="Unique group id (filename without .yml)")
    name: str = Field(..., description="Human-readable group name")
    description: str = Field(default="", description="What this group represents")
    members: list[str] = Field(default_factory=list, description="Node IDs that belong to this group")


class CreateGroupRequest(BaseModel):
    """Request to create a new group."""

    id: str = Field(
        ...,
        min_length=1,
        pattern=r"^[A-Za-z0-9._-]+$",
        description="Unique group id (must not collide with an existing node id)",
    )
    name: str = Field(..., min_length=1, description="Human-readable group name")
    description: str | None = Field(default=None, description="What this group represents")


class UpdateGroupRequest(BaseModel):
    """Request to update a group's metadata fields.

    All fields are optional — only non-None values are applied.
    """

    name: str | None = Field(default=None, description="Human-readable group name")
    description: str | None = Field(default=None, description="What this group represents")


class UpdateGroupMembersRequest(BaseModel):
    """Request to add/remove node IDs from a group's members list."""

    add: list[str] | None = Field(default=None, description="Node IDs to add to the members list")
    remove: list[str] | None = Field(default=None, description="Node IDs to remove from the members list")


# ── Module Imports (L4) ──────────────────────────────────────────────────


class ImportModuleOut(BaseModel):
    """Ein kanonischer Modul-Eintrag aus ``modules[]`` (pydeps-Mapping)."""

    name: str = Field(
        ..., description="Dotted Modul-Pfad (stabile ID über Scans, z. B. 'app.shared.llm_gateway.client.client')"
    )
    path: str = Field(..., description="Repo-relativer Dateipfad (z. B. 'app/shared/llm_gateway/client/client.py')")
    imports: list[str] = Field(
        default_factory=list,
        description="Dotted Namen der importierten Module (dedupliziert, sortiert)",
    )
    top_level: str = Field(..., description="Komponenten-Key/Feature-Pfad (z. B. 'app.shared.llm_gateway')")


class ImportModulesResponse(BaseModel):
    """Kanonische L4-Response: Module eines Systems, optional per top_level gefiltert."""

    system: str = Field(..., description="System-Key der Section (aktuell 'backend')")
    generated_at: str = Field(..., description="ISO-8601-UTC-Zeitstempel (Datei-mtime imports/backend.json)")
    modules: list[ImportModuleOut] = Field(default_factory=list, description="Module des Systems, sortiert nach name")


class NodeSummaryResponse(BaseModel):
    """Response des On-demand Node-Summary-Endpoints.

    LLM-Ausfall oder fehlende Docstrings werden als ``skipped=True`` + ``reason``
    zurückgegeben (graceful, nie ein 5xx für den Nutzer).
    """

    node_id: str = Field(..., description="Node-Key (top_level oder Modul-name)")
    description: str | None = Field(default=None, description="LLM-Zusammenfassung (None bei Skip)")
    skipped: bool = Field(default=False, description="True wenn geskippt (LLM-Ausfall / keine Docstrings)")
    reason: str | None = Field(default=None, description="Skip-Grund (error_type / no_docstrings / ...)")


@dataclass
class MergeResult:
    """Result of a source-based three-way merge.

    Contains the final merged object list and statistics
    for downstream consumers (UI toast, logging).
    """

    merged_objects: list[dict[str, Any]]
    objects_updated: int = 0
    objects_new: int = 0
    objects_missing: int = 0
    skipped_ids: set[str] = field(
        default_factory=set,
    )

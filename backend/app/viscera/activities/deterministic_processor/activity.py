"""Restate activity entry point for deterministic Docker service processing.

Transforms raw service data from ``imports/docker.json`` (DockerComposeParser
output) into fully-qualified C4 architecture objects with catalog-based
technology candidates. This module holds the thin ``run`` handler and the
docker-service orchestration helpers; the diagram/ER/component/tech-lookup
concerns live in the sibling submodules.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import structlog
from restate import Context, Service

from app.viscera.activities.deterministic_processor.components import (
    _extend_l3_batches,
    _prune_component_data,
)
from app.viscera.activities.deterministic_processor.diagrams import _persist_diagram_proposals
from app.viscera.activities.deterministic_processor.er import _process_er_section
from app.viscera.activities.deterministic_processor.tech_lookup import _collect_service_candidates
from app.viscera.repositories.file.architecture_repository import ArchitectureStore

logger = structlog.get_logger(__name__)

deterministic_processor_service = Service("DeterministicProcessor")


def _resolve_project_root() -> Path:
    """Resolve the project root directory (container mount + host fallback).

    The ``architecture/`` dir lives at the project root, so its parent is
    the primary candidate (guarded by a ``docker-compose.yml`` check against
    ``public/``-relative layouts); container CWD and the source-tree anchor
    follow as fallbacks.
    """
    candidates = [
        ArchitectureStore().root().parent,
        Path.cwd(),
        Path(__file__).resolve().parents[6],
    ]
    for candidate in candidates:
        if (candidate / "docker-compose.yml").exists():
            return candidate
    return candidates[0]


def _read_c4_labels(svc: dict[str, Any]) -> dict[str, str | bool] | None:
    """Read C4 classification from ``viscera.*`` Compose labels.

    Required labels:
        ``viscera.system`` — parent system name
        ``viscera.type``  — C4 type: ``system`` / ``container`` / ``data_store`` / ``component``

    Optional labels:
        ``viscera.external`` — default ``"false"``
        ``viscera.parent``   — overrides ``viscera.system`` as parent

    Returns:
        ``{"parent": str, "type": str, "external": bool}`` or ``None`` if
        required labels are missing.
    """
    labels: dict[str, str] = svc.get("labels", {}) or {}
    system = labels.get("viscera.system")
    c4_type = labels.get("viscera.type")
    if not system or not c4_type:
        return None
    return {
        "parent": labels.get("viscera.parent", system),
        "type": c4_type,
        "external": labels.get("viscera.external", "false").lower() == "true",
    }


def _build_description(candidates: list[dict[str, str]], c4_type: str) -> str:
    """Template-based description: ``"{Technology} {Type}"``.

    Uses the top candidate's name when candidates exist; otherwise falls
    back to the neutral C4 type alone (e.g. ``"Container"``). The legacy
    ``"unknown container"`` placeholder is never produced.
    """
    if candidates:
        return f"{candidates[0]['name']} {c4_type}"
    return c4_type


def _build_depends_on_edges(
    service_name: str,
    depends_on: Any,
    now: datetime,
) -> list[dict[str, Any]]:
    """Build edge objects from a service's ``depends_on`` value.

    Accepts both list (``["postgres", "redis"]``) and dict
    (``{"postgres": {"condition": "..."}}``) forms. Returns an empty list
    when ``depends_on`` is absent.
    """
    edges: list[dict[str, Any]] = []
    if not depends_on:
        return edges
    dep_names: list[str] = []
    if isinstance(depends_on, list):
        dep_names = depends_on
    elif isinstance(depends_on, dict):
        dep_names = list(depends_on.keys())
    edges.extend(
        {
            "id": f"{service_name}__{dep_name}",
            "from": service_name,
            "to": dep_name,
            "description": "Depends on",
            "technology": "docker",
            "status": "pending",
            "scan_meta": {"last_scan_at": now.isoformat()},
        }
        for dep_name in dep_names
    )
    return edges


def _build_missing_system_nodes(
    known_system_names: set[str],
    theirs: list[dict[str, Any]],
    now: datetime,
) -> list[dict[str, Any]]:
    """Create ``system`` nodes for ``viscera.system`` values without an object.

    New systems referenced only via ``viscera.system`` labels get a
    ``pending`` system node so the parent hierarchy stays complete.
    """
    existing_ids: set[str] = {obj["id"] for obj in theirs}
    system_nodes: list[dict[str, Any]] = [
        {
            "id": system_name,
            "name": system_name,
            "description": "",
            "type": "system",
            "status": "pending",
            "tags": [],
            "scan_meta": {"last_scan_at": now.isoformat()},
        }
        for system_name in sorted(known_system_names - existing_ids)
    ]
    return system_nodes


@deterministic_processor_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Process Docker service data into architecture objects and edges.

    Reads ``architecture/_pipeline/imports/docker.json`` → docker section,
    collects two-stage catalog technology candidates per service, reads C4
    classification from ``viscera.*`` Compose labels, generates
    edges from ``depends_on``, and persists via
    ``persist_merge_result`` (three-way merge into individual files under
    ``architecture/nodes/``, ``architecture/edges/`` and
    ``architecture/diagrams/``). L3 components (``type="component"``,
    ``parent="backend"``) and their ``imports`` edges are built from the
    ``backend.json`` ``modules[]`` (PydepsActivity output) and persisted as
    first-class objects exactly like L1/L2; stale scanner-created L3
    artefacts are pruned by their fresh-ID set. The ER section persists table
    nodes (``type="table"``, incl. ``columns[]``) and FK edges
    (``description="references"``) from ``_pipeline/tables/*.json`` via the
    ``nodes/``/``edges/`` merge.

    Args:
        ctx: Restate context.

    Returns:
        Dict with ``ok``, ``objects_created``, ``edges_created``,
        ``diagrams_created``, ``table_nodes_created``, ``fk_edges_created``,
        ``components_created``, ``import_edges_created``,
        ``er_diagrams_created``.
    """
    arch_dir = ArchitectureStore().root()
    project_root = _resolve_project_root()
    imports_path = arch_dir / "_pipeline" / "imports" / "docker.json"

    logger.info("DeterministicProcessor: reading from %s", imports_path)

    try:
        if not imports_path.exists():
            logger.error("DeterministicProcessor: imports/docker.json not found at %s", imports_path)
            return {"ok": False, "error": f"imports/docker.json not found at {imports_path}"}

        docker_imports = json.loads(imports_path.read_text(encoding="utf-8"))
        docker_services: list[dict[str, Any]] = docker_imports.get("docker", [])

        if not docker_services:
            logger.info("DeterministicProcessor: no docker services in imports/docker.json")
            return {
                "ok": True,
                "objects_created": 0,
                "edges_created": 0,
            }

        from app.shared.db_access.session import AsyncSessionLocal as CoreSessionLocal
        from app.shared.db_access.session import AsyncSessionLocal as GjoSeSessionLocal

        now = datetime.now(UTC)
        theirs: list[dict[str, Any]] = []
        edges: list[dict[str, Any]] = []
        objects_created = 0
        edges_created = 0
        known_system_names: set[str] = set()

        async with CoreSessionLocal() as core_db, GjoSeSessionLocal() as gjo_se_db:
            for svc in docker_services:
                service_name: str = svc["name"]

                # ── Read C4 labels (fail-closed) ──────────────────────
                labels_result = _read_c4_labels(svc)
                if labels_result is None:
                    logger.info(
                        "DeterministicProcessor: skipping '%s' — missing viscera.system or viscera.type labels",
                        service_name,
                    )
                    continue

                # ── Technology candidates (never assigned) ─────────────
                # Image candidates come from the two-stage lookup, build
                # candidates from pyproject/package.json. A failing lookup
                # yields a warning + empty list, never an abort.
                candidates = await _collect_service_candidates(
                    svc,
                    project_root,
                    gjo_se_db,
                    core_db,
                )

                # ── Template description ────────────────────────────────
                description = _build_description(
                    candidates,
                    str(labels_result["type"]),
                )

                # ── Build architecture object ───────────────────────────
                obj: dict[str, Any] = {
                    "id": service_name,
                    "name": service_name,
                    "description": description,
                    "type": labels_result["type"],
                    "parent": labels_result["parent"],
                    "external": labels_result["external"],
                    "tags": [],
                    "scan_meta": {
                        "last_scan_at": now.isoformat(),
                        "technology_candidates": candidates,
                    },
                }

                theirs.append(obj)
                objects_created += 1
                known_system_names.add(str(labels_result["parent"]))

                # ── Generate edges from depends_on ───────────────────────
                for edge in _build_depends_on_edges(
                    service_name,
                    svc.get("depends_on"),
                    now,
                ):
                    edges.append(edge)
                    edges_created += 1

        # ── Create system nodes for new viscera.system values ───────────
        for system_obj in _build_missing_system_nodes(known_system_names, theirs, now):
            theirs.append(system_obj)
            objects_created += 1

        # ── L3 components + import edges (backend.json) ──────────────────
        # L3 components are first-class objects (``type="component"``,
        # ``parent="backend"``), one per distinct ``top_level`` of the
        # ``modules[]`` written by PydepsActivity. Cross-component imports
        # become real ``imports`` edges. Both are appended to the shared
        # ``theirs``/``edges`` batches so the single persist call in
        # ``_process_er_section`` merges docker + ER + L3 together
        # (cross-contamination guard — a separate call would flag docker/ER
        # as ``scan_missing``).
        component_nodes, component_edges = _extend_l3_batches(arch_dir, now, theirs, edges)
        components_created = len(component_nodes)
        import_edges_created = len(component_edges)

        # ── Persist objects + edges (docker + ER + L3, merged together) ──
        # Docker objects/edges, ER table nodes/FK edges and L3 component
        # objects/import edges share the nodes//edges/ directories. Merging
        # them in single calls keeps the merge matrix from flagging the other
        # classes as ``scan_missing``. ER reads ``_pipeline/tables/*.json``
        # (scanner output, Inc 1) and persists table nodes (incl.
        # ``columns[]`` for the FE card) and FK edges; gracefully skips the ER
        # part when the tables files are missing. Self-cleaning prunes stale
        # scanner-created artefacts (ER + L3) by their fresh-ID sets.
        er_result = _process_er_section(arch_dir, now, theirs, edges)
        merge_result = er_result["node_merge_result"]

        # ── Self-cleaning: prune stale L3 component artefacts ───────────
        # Only scanner-created component objects / import edges that are absent
        # from the current scan's fresh-ID set are removed — nothing more.
        _prune_component_data(arch_dir, {n["id"] for n in component_nodes}, {e["id"] for e in component_edges})

        # ── Persist diagram proposals via three-way merge ──────────────
        # Mapping rule (Finding 5.4): 1 systemContext + 1 container diagram
        # per system with containers + the L3 component diagram
        # (``backend-components``) + the ER ``dataModel`` diagrams. They are
        # merged together in one call (cross-contamination guard): a separate
        # ER diagram merge would flag the L1/L2 diagrams as ``scan_missing``
        # and destroy user/approved locks. Matrix (Finding 6.1) protects
        # approved/user diagrams.
        er_proposals = er_result["er_diagram_proposals"]
        diagrams_created = (
            _persist_diagram_proposals(merge_result, now, er_proposals) if merge_result is not None else 0
        )

        logger.info(
            "DeterministicProcessor: done — %d objects, %d edges, %d diagrams, "
            "%d table nodes, %d FK edges, %d components, %d import edges, "
            "%d ER diagrams created, %d ER diagrams pruned",
            objects_created,
            edges_created,
            diagrams_created,
            er_result["table_nodes"],
            er_result["fk_edges"],
            components_created,
            import_edges_created,
            len(er_proposals),
            er_result["pruned_er_diagrams"],
        )

        return {
            "ok": True,
            "objects_created": objects_created,
            "edges_created": edges_created,
            "diagrams_created": diagrams_created,
            "table_nodes_created": er_result["table_nodes"],
            "fk_edges_created": er_result["fk_edges"],
            "components_created": components_created,
            "import_edges_created": import_edges_created,
            "er_diagrams_created": len(er_proposals),
            "er_diagrams_pruned": er_result["pruned_er_diagrams"],
        }

    except Exception:
        logger.exception("DeterministicProcessor: unexpected error")
        return {"ok": False, "error": "Unexpected error during deterministic processing"}

"""Diagram service layer.

Handles CRUD operations for architecture diagrams stored as individual
YAML files under ``architecture/diagrams/{key}.yml``. Node positions are
stored inline in the diagram YAML under the ``nodes`` map
(``{nodeId: {x, y}, ...}``) — the legacy ``architecture/layout/`` directory
is no longer used.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import structlog
from ruamel.yaml import YAMLError

from app.viscera.repositories.file.architecture_repository import SOURCE_CODE, ArchitectureStore
from app.viscera.schemas.architecture_schemas import (
    CreateDiagramRequest,
    DiagramResponse,
    UpdateDiagramRequest,
)
from app.viscera.services.architecture_yaml_io_service import _atomic_write_yaml, _yaml

logger = structlog.get_logger(__name__)


# ── Path Helpers ──────────────────────────────────────────────────────────


def _diagrams_dir(source: str = SOURCE_CODE) -> Path:
    """Return the source's ``diagrams/`` directory (ensured to exist).

    ``source='code'`` resolves to ``architecture/diagrams/``,
    ``source='golden'`` to ``architecture/golden/diagrams/``.
    """
    path = ArchitectureStore(source).diagrams_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def _diagram_path(key: str, source: str = SOURCE_CODE) -> Path:
    """Return the source's ``diagrams/{key}.yml``."""
    return _diagrams_dir(source) / f"{key}.yml"


# ── YAML I/O ──────────────────────────────────────────────────────────────


def _load_diagram_file(filepath: str) -> dict[str, Any] | None:
    """Load a single diagram YAML file, returning None on any error."""
    try:
        with open(filepath, encoding="utf-8") as fh:
            data = _yaml.load(fh)
        if isinstance(data, dict):
            return data
        logger.warning("Diagram file %s is not a dict: %s", filepath, type(data))
        return None
    except (YAMLError, OSError) as exc:
        logger.warning("Cannot load diagram file %s: %s", filepath, exc)
        return None


# ── Public API ────────────────────────────────────────────────────────────


def list_diagrams(source: str = SOURCE_CODE) -> list[DiagramResponse]:
    """List all diagrams from the source's ``diagrams/`` directory.

    Reads every ``*.yml`` file, parses it, and returns a list of
    ``DiagramResponse`` objects sorted by key. ``source='code'`` reads from
    ``architecture/diagrams/``, ``source='golden'`` from
    ``architecture/golden/diagrams/``.
    """
    diagrams_dir = _diagrams_dir(source)
    results: list[DiagramResponse] = []

    for filepath in sorted(diagrams_dir.glob("*.yml")):
        data = _load_diagram_file(str(filepath))
        if data is None:
            continue

        key = filepath.stem
        results.append(_diagram_to_response(key, data))

    return results


def create_diagram(data: CreateDiagramRequest, source: str = SOURCE_CODE) -> DiagramResponse:
    """Create a new diagram as ``architecture/{source}/diagrams/{key}.yml``.

    Writes the ``nodes`` map (empty by default) inline into the diagram
    YAML. The legacy ``architecture/layout/{key}.yml`` file is no longer
    created. The diagram's ``source`` is persisted as a YAML field on create
    and becomes immutable afterwards.

    Args:
        data: Validated create-diagram request.
        source: Architecture source ('code' | 'golden'). Default: 'code'.

    Returns:
        The created diagram as a ``DiagramResponse``.

    Raises:
        ValueError: If the diagram key already exists.
    """
    diagram_path = _diagram_path(data.key, source)

    if diagram_path.exists():
        raise ValueError(f"Diagram with key '{data.key}' already exists")

    diagram_data: dict[str, Any] = {
        "name": data.name,
        "type": data.type,
        "nodes": data.nodes if data.nodes is not None else {},
        "status": data.status if data.status is not None else "viscera-approved",
        "scan_meta": data.scan_meta.model_dump() if data.scan_meta is not None else None,
        "source": source,
    }
    if data.description is not None:
        diagram_data["description"] = data.description
    if data.parent is not None:
        diagram_data["parent"] = data.parent
    if data.base is not None:
        diagram_data["base"] = data.base
    if data.layout is not None:
        diagram_data["layout"] = data.layout

    _atomic_write_yaml(str(diagram_path), diagram_data)

    logger.info("Created diagram '%s' at %s/diagrams/%s.yml", data.key, source, data.key)

    return _diagram_to_response(data.key, diagram_data)


def delete_diagram(key: str, source: str = SOURCE_CODE) -> dict[str, str]:
    """Delete a diagram.

    Removes ``architecture/{source}/diagrams/{key}.yml`` from disk. The legacy
    ``architecture/layout/{key}.yml`` file is intentionally not touched
    (the layout directory is deprecated).

    Args:
        key: Diagram key (filename without .yml extension).
        source: Architecture source ('code' | 'golden'). Default: 'code'.

    Returns:
        Dict with ``status`` and ``message`` fields.

    Raises:
        ValueError: If the diagram file does not exist.
    """
    diagram_path = _diagram_path(key, source)

    if not diagram_path.exists():
        raise ValueError(f"Diagram with key '{key}' not found")

    os.remove(str(diagram_path))
    logger.info("Deleted diagram '%s' (%s/diagrams/%s.yml)", key, source, key)

    return {"status": "deleted", "message": f"Diagram '{key}' deleted"}


def update_diagram(key: str, data: UpdateDiagramRequest, source: str = SOURCE_CODE) -> DiagramResponse:
    """Update a diagram's metadata fields.

    Merges non-None fields from *data* into the diagram YAML atomically.
    Only fields that are explicitly set (not None) are overwritten. The
    ``source`` field is intentionally not updated (provenance is immutable
    after create).

    Args:
        key: Diagram key.
        data: Request with optional fields to update.
        source: Architecture source ('code' | 'golden'). Default: 'code'.

    Returns:
        The updated diagram as a ``DiagramResponse``.

    Raises:
        ValueError: If the diagram file does not exist or is corrupted.
    """
    diagram_path = _diagram_path(key, source)

    if not diagram_path.exists():
        raise ValueError(f"Diagram with key '{key}' not found")

    diagram_data = _load_diagram_file(str(diagram_path))
    if diagram_data is None:
        raise ValueError(f"Diagram file '{key}' is corrupted or empty")

    changed_fields: list[str] = []

    for field_name in ("name", "description", "type", "layout", "parent", "status", "base"):
        value = getattr(data, field_name)
        if value is not None:
            diagram_data[field_name] = value
            changed_fields.append(field_name)

    _atomic_write_yaml(str(diagram_path), diagram_data)

    if changed_fields:
        logger.info(
            "Updated diagram '%s': changed fields=%s",
            key,
            changed_fields,
        )
    else:
        logger.info("No fields changed for diagram '%s'", key)

    return _diagram_to_response(key, diagram_data)


def update_diagram_nodes(
    key: str,
    node_id: str,
    x: float,
    y: float,
    width: float | None = None,
    height: float | None = None,
    description: str | None = None,
    source: str = SOURCE_CODE,
) -> DiagramResponse:
    """Set the position (and optional bounds) of a single node within a diagram.

    Loads ``architecture/{source}/diagrams/{key}.yml``, sets
    ``nodes[node_id] = {x, y}`` (plus ``width``/``height``/``description``
    if provided) and writes the file atomically.

    Args:
        key: Diagram key.
        node_id: Node identifier whose position should be updated.
        x: X coordinate of the node position.
        y: Y coordinate of the node position.
        width: Optional node width (group boundary, #2292).
        height: Optional node height (group boundary, #2292).
        description: Optional curated node description (L4 file nodes,
            LLM-ready).
        source: Architecture source ('code' | 'golden'). Default: 'code'.

    Returns:
        The updated diagram as a ``DiagramResponse``.

    Raises:
        ValueError: If the diagram file does not exist or is corrupted.
    """
    diagram_path = _diagram_path(key, source)

    if not diagram_path.exists():
        raise ValueError(f"Diagram with key '{key}' not found")

    diagram_data = _load_diagram_file(str(diagram_path))
    if diagram_data is None:
        raise ValueError(f"Diagram file '{key}' is corrupted or empty")

    nodes: dict[str, Any] | None = diagram_data.get("nodes")
    if not isinstance(nodes, dict):
        nodes = {}
    node_entry: dict[str, Any] = {"x": x, "y": y}
    if width is not None:
        node_entry["width"] = width
    if height is not None:
        node_entry["height"] = height
    if description is not None:
        node_entry["description"] = description
    nodes[node_id] = node_entry
    diagram_data["nodes"] = nodes

    _atomic_write_yaml(str(diagram_path), diagram_data)

    logger.info(
        "Updated node '%s' in diagram '%s': x=%s, y=%s, width=%s, height=%s",
        node_id,
        key,
        x,
        y,
        width,
        height,
    )

    return _diagram_to_response(key, diagram_data)


def update_diagram_nodes_batch(key: str, nodes: dict[str, Any], source: str = SOURCE_CODE) -> DiagramResponse:
    """Replace the entire ``nodes`` map of a diagram at once (#2232).

    Loads ``architecture/{source}/diagrams/{key}.yml``, replaces the ``nodes``
    field with the given map, and writes the file atomically.

    An empty ``nodes`` dict clears all persisted positions (used by
    "Reset Layout").

    Args:
        key: Diagram key.
        nodes: Full node-position map ``{nodeId: {x, y}, ...}``.
        source: Architecture source ('code' | 'golden'). Default: 'code'.

    Returns:
        The updated diagram as a ``DiagramResponse``.

    Raises:
        ValueError: If the diagram file does not exist or is corrupted.
    """
    diagram_path = _diagram_path(key, source)

    if not diagram_path.exists():
        raise ValueError(f"Diagram with key '{key}' not found")

    diagram_data = _load_diagram_file(str(diagram_path))
    if diagram_data is None:
        raise ValueError(f"Diagram file '{key}' is corrupted or empty")

    diagram_data["nodes"] = nodes

    _atomic_write_yaml(str(diagram_path), diagram_data)

    logger.info(
        "Batch-updated %d node positions in diagram '%s'",
        len(nodes),
        key,
    )

    return _diagram_to_response(key, diagram_data)


# ── Helpers ───────────────────────────────────────────────────────────────


def _diagram_to_response(key: str, data: dict[str, Any]) -> DiagramResponse:
    """Convert a raw diagram dict + key into a DiagramResponse.

    Backward-compat: if the ``nodes`` field is missing (legacy YAMLs),
    an empty map is returned. ``status`` defaults to ``pending`` and
    ``scan_meta`` to ``None`` (user-created). Missing ``source`` defaults
    to ``"code"`` so old diagram YAMLs remain code-world.
    """
    raw_nodes = data.get("nodes")
    nodes = raw_nodes if isinstance(raw_nodes, dict) else {}
    return DiagramResponse(
        key=key,
        name=data.get("name", key),
        type=data.get("type", "systemContext"),
        description=data.get("description", ""),
        parent=data.get("parent"),
        base=data.get("base"),
        layout=data.get("layout"),
        nodes=nodes,
        status=data.get("status", "viscera-approved"),
        scan_meta=data.get("scan_meta"),
        source=data.get("source", "code"),
    )

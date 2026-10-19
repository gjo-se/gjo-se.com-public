"""Edge service layer.

Handles CRUD operations for architecture edges stored as
individual YAML files under ``architecture/edges/{from}__{to}.yml``.

Uses atomic writes (tempfile + os.replace) to prevent data corruption.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import structlog
from ruamel.yaml import YAMLError

from app.viscera.repositories.file.architecture_repository import SOURCE_CODE, ArchitectureStore
from app.viscera.services.architecture_yaml_io_service import _atomic_write_yaml, _yaml

logger = structlog.get_logger(__name__)


# ── Path Helpers ────────────────────────────────────────────────────────────


def _edges_dir(source: str = SOURCE_CODE) -> Path:
    """Return the source's ``edges/`` directory (ensured to exist)."""
    edge_dir = ArchitectureStore(source).edges_dir()
    edge_dir.mkdir(parents=True, exist_ok=True)
    return edge_dir


def _edge_filename(from_id: str, to_id: str) -> str:
    """Build the composite filename: ``{from}__{to}.yml``."""
    return f"{from_id}__{to_id}.yml"


# ── CRUD Operations ──────────────────────────────────────────────────────────


def list_edges(source: str = SOURCE_CODE) -> list[dict[str, Any]]:
    """List all edges from the source's ``edges/`` directory.

    Reads every ``*.yml`` file and returns them as a flat list,
    sorted by filename.

    Args:
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.
    """
    edge_dir = ArchitectureStore(source).edges_dir()
    result: list[dict[str, Any]] = []

    if not edge_dir.is_dir():
        return result

    for filepath in sorted(edge_dir.glob("*.yml")):
        try:
            with open(str(filepath), encoding="utf-8") as fh:
                data = _yaml.load(fh)
        except (YAMLError, OSError) as exc:
            logger.warning("Cannot load edge file %s: %s", filepath, exc)
            continue
        if isinstance(data, dict) and "from" in data and "to" in data:
            result.append(data)

    return result


def create_edge(data: dict[str, Any], source: str = SOURCE_CODE) -> dict[str, Any]:
    """Create a new edge as ``edges/{from}__{to}.yml``.

    Validates uniqueness — raises ``ValueError`` if an edge
    between the same ``from`` and ``to`` already exists.

    Args:
        data: Dict with ``from``, ``to``, optional ``description``, ``technology``,
              ``tags``, ``scan_meta``, ``status``.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The created edge as a dictionary.

    Raises:
        ValueError: If an edge with the same ``from``/``to`` already exists.
    """
    from_id = str(data["from"])
    to_id = str(data["to"])
    filename = _edge_filename(from_id, to_id)

    edge_dir = _edges_dir(source)
    edge_path = edge_dir / filename

    if edge_path.exists():
        raise ValueError(f"Edge '{from_id}' → '{to_id}' already exists")

    new_edge: dict[str, Any] = {
        "from": from_id,
        "to": to_id,
    }
    if data.get("description"):
        new_edge["description"] = data["description"]
    if data.get("technology"):
        new_edge["technology"] = data["technology"]
    if data.get("tags"):
        new_edge["tags"] = data["tags"]
    if data.get("scan_meta"):
        new_edge["scan_meta"] = data["scan_meta"]
    if data.get("status"):
        new_edge["status"] = data["status"]

    _atomic_write_yaml(str(edge_path), new_edge)
    logger.info("Created edge '%s' → '%s' at edges/%s", from_id, to_id, filename)

    return new_edge


def update_edge(edge_id: str, data: dict[str, Any], source: str = SOURCE_CODE) -> dict[str, Any]:
    """Update fields of an edge identified by ``{from}__{to}``.

    Only updates whitelisted fields: ``description``, ``technology``, ``tags``.
    Persists atomically after patching.

    Args:
        edge_id: Composite ID ``{from}__{to}``.
        data: Dict with optional ``description``, ``technology``, ``tags`` fields.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The updated edge as a dictionary.

    Raises:
        ValueError: If the edge file does not exist.
    """
    edge_dir = _edges_dir(source)
    edge_path = edge_dir / f"{edge_id}.yml"

    if not edge_path.exists():
        raise ValueError(f"Edge with id '{edge_id}' not found")

    with open(str(edge_path), encoding="utf-8") as fh:
        edge = _yaml.load(fh)

    if not isinstance(edge, dict):
        raise ValueError(f"Edge file {edge_id}.yml is not a valid dict")

    allowed_fields = {"description", "technology", "tags", "status", "scan_meta"}
    for key, value in data.items():
        if key in allowed_fields and value is not None:
            edge[key] = value

    _atomic_write_yaml(str(edge_path), edge)
    logger.info("Updated edge '%s'", edge_id)

    return dict(edge)


def delete_edge(edge_id: str, source: str = SOURCE_CODE) -> dict[str, str]:
    """Delete an edge file by its composite ID ``{from}__{to}``.

    Args:
        edge_id: Composite ID ``{from}__{to}``.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        ``{"status": "deleted"}`` on success.

    Raises:
        ValueError: If the edge file does not exist.
    """
    edge_dir = _edges_dir(source)
    edge_path = edge_dir / f"{edge_id}.yml"

    if not edge_path.exists():
        raise ValueError(f"Edge with id '{edge_id}' not found")

    os.remove(str(edge_path))
    logger.info("Deleted edge '%s' (edges/%s.yml)", edge_id, edge_id)

    return {"status": "deleted"}

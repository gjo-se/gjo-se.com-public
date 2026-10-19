"""Loading of architecture object collections from YAML files.

Reads the per-object YAML files under a source's ``nodes/`` (or
``edges/``/``diagrams/``) directory into the ``{"nodes": [...]}`` shape used by
the merge matrix. Consumers: :mod:`app.viscera.services.architecture_merge_service`
(merge input) and the read API (``list_all_objects``).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import structlog
from ruamel.yaml import YAMLError

from app.viscera.repositories.file.architecture_repository import SOURCE_CODE, ArchitectureStore
from app.viscera.services.architecture_yaml_io_service import _load_yaml_file

logger = structlog.get_logger(__name__)


def _load_objects_from_dir(nodes_dir: Path) -> dict[str, Any]:
    """Load all object YAML files from ``nodes/``, ``edges/`` or ``diagrams/`` directory.

    For node files: expects ``id`` field.
    For edge files (no ``id``, has ``from`` + ``to``): derives ``id`` as ``{from}__{to}``.
    For diagram files (no ``id``, has ``name`` + ``type``): derives ``key`` from the filename stem.

    Returns dict in format ``{"nodes": [...]}`` suitable for
    :func:`merge_into_ist_three_way`.
    """
    objects: list[dict[str, Any]] = []
    if not nodes_dir.is_dir():
        return {"nodes": objects}

    for filepath in sorted(nodes_dir.glob("*.yml")):
        try:
            data = _load_yaml_file(str(filepath))
        except (YAMLError, OSError) as exc:
            logger.warning("Cannot load object file %s: %s", filepath, exc)
            continue
        if isinstance(data, dict):
            if "id" in data:
                objects.append(data)
            elif "from" in data and "to" in data:
                # Edge file without id: derive composite id from from/to
                data["id"] = f"{data['from']}__{data['to']}"
                objects.append(data)
            elif "key" in data:
                # Diagram file with explicit key field (scanner-created)
                objects.append(data)
            elif "name" in data and "type" in data:
                # Legacy diagram file without key: derive key from filename
                data["key"] = filepath.stem
                objects.append(data)

    return {"nodes": objects}


def list_all_objects(source: str = SOURCE_CODE) -> list[dict[str, Any]]:
    """List all architecture objects from ``nodes/`` directory.

    Returns a flat list of object dicts, sorted by filename. Missing
    ``description`` fields are normalized to ``""`` so API consumers
    always receive the full object shape (older or scanner-written
    node files may omit the field).

    Args:
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.
    """
    nodes_dir = ArchitectureStore(source).nodes_dir()
    objects = _load_objects_from_dir(nodes_dir)["nodes"]
    for obj in objects:
        obj.setdefault("description", "")
    return objects

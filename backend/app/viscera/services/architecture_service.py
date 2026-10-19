"""Architecture service layer (object/edge CRUD).

Public write/read facade for individual architecture objects and edges:
field update, create, delete. Delegates low-level YAML I/O to
:mod:`app.viscera.services.architecture_yaml_io_service`, collection loading to
:mod:`app.viscera.services.architecture_objects_service` and the scan merge to
:mod:`app.viscera.services.architecture_merge_service`.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import structlog
from ruamel.yaml import YAMLError

from app.viscera.repositories.file.architecture_repository import SOURCE_CODE, ArchitectureStore
from app.viscera.schemas.architecture_schemas import CreateEdgeRequest, CreateObjectRequest
from app.viscera.services.architecture_validation_service import ALLOWED_FIELDS, _validate_field_value
from app.viscera.services.architecture_yaml_io_service import (
    _atomic_write_yaml,
    _try_update_in_file,
    _walk_yaml_files,
)

logger = structlog.get_logger(__name__)


def update_object_field(
    object_id: str,
    field: str,
    value: object,
    source: str = SOURCE_CODE,
) -> dict[str, Any]:
    """Update a single field of an architecture model object.

    Searches all YAML files under the source's ``architecture/`` tree for the
    object identified by *object_id*, updates *field* to *value*, validates
    the result, and writes the file back to disk atomically.

    Args:
        object_id: Dot-separated ID (e.g. ``"backend"`` or ``"backend.fastapi"``).
        field: Field name to update (``"name"`` or ``"description"``).
        value: New value for the field.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The updated object as a dictionary.

    Raises:
        ValueError: If *field* is not in ``ALLOWED_FIELDS``, *value* is invalid,
                    or the object is not found.
        FileNotFoundError: If the architecture directory does not exist.
    """
    if field not in ALLOWED_FIELDS:
        raise ValueError(f"Field '{field}' is not allowed. Allowed: {sorted(ALLOWED_FIELDS)}")

    _validate_field_value(field, value)

    arch_root = ArchitectureStore(source).root()
    if not arch_root.is_dir():
        raise FileNotFoundError(f"Architecture directory not found: {arch_root}")

    # Walk all YAML files
    for full_path in _walk_yaml_files(arch_root):
        try:
            updated_object = _try_update_in_file(full_path, object_id, field, value)
            if updated_object is not None:
                logger.info(
                    "Updated field '%s' of object '%s' in %s",
                    field,
                    object_id,
                    os.path.relpath(full_path, arch_root),
                )
                return updated_object
        except YAMLError as exc:
            logger.warning("YAML parse error in %s: %s", full_path, exc)
            continue
        except OSError as exc:
            logger.warning("Cannot read/write file %s: %s", full_path, exc)
            continue

    raise ValueError(f"Object with id '{object_id}' not found in any YAML file")


def delete_object_from_ist(object_id: str, source: str = SOURCE_CODE) -> dict[str, str]:
    """Delete an architecture object file by its ID.

    Removes the source's ``nodes/{object_id}.yml`` from disk.

    Args:
        object_id: Dot-separated ID (e.g. ``"backend"`` or ``"backend.fastapi"``).
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        A dict with ``status`` and ``message`` fields.

    Raises:
        ValueError: If the object file does not exist.
    """
    arch_root = ArchitectureStore(source).root()
    obj_path = arch_root / "nodes" / f"{object_id}.yml"

    if not obj_path.exists():
        raise ValueError(f"Object with id '{object_id}' not found")

    os.remove(obj_path)
    logger.info("Deleted object '%s' (nodes/%s.yml)", object_id, object_id)
    return {"status": "deleted", "message": f"Object '{object_id}' deleted"}


def _object_exists_in_files(arch_root: Path, object_id: str) -> bool:
    """Check if an object file already exists in ``nodes/`` directory."""
    obj_path = arch_root / "nodes" / f"{object_id}.yml"
    return obj_path.exists()


def create_object(data: CreateObjectRequest, source: str = SOURCE_CODE) -> dict[str, Any]:
    """Create a new architecture object as ``nodes/{id}.yml``.

    Validates uniqueness of the object ID, then writes the new object
    with ``status: "viscera-approved"`` and ``scan_meta: null`` as an individual
    YAML file under the source's ``nodes/`` directory.

    Args:
        data: Validated create-object request with id, name, type, etc.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The created object as a dictionary.

    Raises:
        ValueError: If the object ID already exists.
    """
    arch_root = ArchitectureStore(source).root()
    nodes_dir = arch_root / "nodes"
    nodes_dir.mkdir(parents=True, exist_ok=True)

    if _object_exists_in_files(arch_root, data.id):
        raise ValueError(f"Object with id '{data.id}' already exists")

    new_object: dict[str, Any] = {
        "id": data.id,
        "name": data.name,
        "description": data.description or "",
        "status": "viscera-approved",
        "scan_meta": None,
    }
    if data.type is not None:
        new_object["type"] = data.type
    if data.technologies:
        new_object["technologies"] = data.technologies
    if data.tags:
        new_object["tags"] = data.tags
    if data.parent is not None:
        new_object["parent"] = data.parent

    obj_path = nodes_dir / f"{data.id}.yml"
    _atomic_write_yaml(str(obj_path), new_object)
    logger.info("Created object '%s' at nodes/%s.yml", data.id, data.id)

    return new_object


def create_edge(data: CreateEdgeRequest, source: str = SOURCE_CODE) -> dict[str, Any]:
    """Create a new edge as ``edges/{from}__{to}.yml``.

    Validates that both ``from_id`` and ``to_id`` reference existing
    objects, then writes the edge as an individual YAML file.

    Args:
        data: Validated create-edge request.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The created edge as a dictionary.

    Raises:
        ValueError: If ``from_id`` or ``to_id`` do not exist, or an
                    edge between them already exists.
    """
    arch_root = ArchitectureStore(source).root()

    # Validate that both IDs exist
    if not _object_exists_in_files(arch_root, data.from_id):
        raise ValueError(f"Object with id '{data.from_id}' not found in any YAML file")
    if not _object_exists_in_files(arch_root, data.to_id):
        raise ValueError(f"Object with id '{data.to_id}' not found in any YAML file")

    edge_data: dict[str, Any] = {
        "from": data.from_id,
        "to": data.to_id,
    }
    if data.description is not None:
        edge_data["description"] = data.description
    if data.technology is not None:
        edge_data["technology"] = data.technology
    if data.tags:
        edge_data["tags"] = data.tags
    if data.scan_meta is not None:
        edge_data["scan_meta"] = data.scan_meta.model_dump()
    if data.status is not None:
        edge_data["status"] = data.status

    from app.viscera.services.edge_service import create_edge as _edge_create

    return _edge_create(edge_data, source=source)


def delete_edge(edge_id: str, source: str = SOURCE_CODE) -> dict[str, Any]:
    """Delete an edge by its composite ID ``{from}__{to}``.

    Removes the source's ``edges/{from}__{to}.yml`` from disk.

    Args:
        edge_id: Composite key in the format ``"from__to"``
                 (double-underscore separator).
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        ``{"status": "deleted"}`` on success.

    Raises:
        ValueError: If the edge is not found.
    """
    from app.viscera.services.edge_service import delete_edge as _edge_delete

    return _edge_delete(edge_id, source=source)

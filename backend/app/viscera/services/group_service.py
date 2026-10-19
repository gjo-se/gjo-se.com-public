"""Group service layer.

Handles CRUD operations for architecture groups stored as individual
YAML files under ``architecture/groups/{id}.yml``. Groups are
user-defined objects (Finding 9.0) — the scanner never touches
``groups/``. A group YAML contains only ``id``, ``name``,
``description`` and ``members``.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import structlog
from ruamel.yaml import YAMLError

from app.viscera.repositories.file.architecture_repository import SOURCE_CODE, ArchitectureStore
from app.viscera.schemas.architecture_schemas import (
    CreateGroupRequest,
    GroupResponse,
    UpdateGroupMembersRequest,
    UpdateGroupRequest,
)
from app.viscera.services.architecture_yaml_io_service import _atomic_write_yaml, _yaml

logger = structlog.get_logger(__name__)


# ── Path Helpers ──────────────────────────────────────────────────────────


def _groups_dir(source: str = SOURCE_CODE) -> Path:
    """Return the source's ``groups/`` directory (ensured to exist)."""
    path = ArchitectureStore(source).groups_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def _group_path(group_id: str, source: str = SOURCE_CODE) -> Path:
    """Return the source's ``groups/{id}.yml``."""
    return _groups_dir(source) / f"{group_id}.yml"


# ── YAML I/O ──────────────────────────────────────────────────────────────


def _load_group_file(filepath: str) -> dict[str, Any] | None:
    """Load a single group YAML file, returning None on any error."""
    try:
        with open(filepath, encoding="utf-8") as fh:
            data = _yaml.load(fh)
        if isinstance(data, dict):
            return data
        logger.warning("Group file %s is not a dict: %s", filepath, type(data))
        return None
    except (YAMLError, OSError) as exc:
        logger.warning("Cannot load group file %s: %s", filepath, exc)
        return None


# ── Public API ────────────────────────────────────────────────────────────


def list_groups(source: str = SOURCE_CODE) -> list[GroupResponse]:
    """List all groups from the source's ``groups/`` directory.

    Reads every ``*.yml`` file, parses it, and returns a list of
    ``GroupResponse`` objects sorted by id.

    Args:
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.
    """
    groups_dir = ArchitectureStore(source).groups_dir()

    if not groups_dir.is_dir():
        return []

    results: list[GroupResponse] = []

    for filepath in sorted(groups_dir.glob("*.yml")):
        data = _load_group_file(str(filepath))
        if data is None:
            continue

        group_id = filepath.stem
        results.append(_group_to_response(group_id, data))

    return results


def create_group(data: CreateGroupRequest, source: str = SOURCE_CODE) -> GroupResponse:
    """Create a new group as the source's ``groups/{id}.yml``.

    Args:
        data: Validated create-group request.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The created group as a ``GroupResponse``.

    Raises:
        ValueError: If the group already exists or its id collides
                    with an existing node id.
    """
    group_path = _group_path(data.id, source)

    if group_path.exists():
        raise ValueError(f"Group with id '{data.id}' already exists")

    node_path = ArchitectureStore(source).nodes_dir() / f"{data.id}.yml"
    if node_path.exists():
        raise ValueError(f"Group id '{data.id}' conflicts with an existing node id")

    group_data: dict[str, Any] = {
        "id": data.id,
        "name": data.name,
        "description": data.description if data.description is not None else "",
        "members": [],
    }

    _atomic_write_yaml(str(group_path), group_data)

    logger.info("Created group '%s' at groups/%s.yml", data.id, data.id)

    return _group_to_response(data.id, group_data)


def delete_group(group_id: str, source: str = SOURCE_CODE) -> dict[str, str]:
    """Delete a group.

    Removes the source's ``groups/{id}.yml`` from disk. Member nodes
    are intentionally not touched.

    Args:
        group_id: Group id (filename without .yml extension).
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        Dict with ``status`` and ``message`` fields.

    Raises:
        ValueError: If the group file does not exist.
    """
    group_path = _group_path(group_id, source)

    if not group_path.exists():
        raise ValueError(f"Group with id '{group_id}' not found")

    os.remove(str(group_path))
    logger.info("Deleted group '%s' (groups/%s.yml)", group_id, group_id)

    return {"status": "deleted", "message": f"Group '{group_id}' deleted"}


def update_group(group_id: str, data: UpdateGroupRequest, source: str = SOURCE_CODE) -> GroupResponse:
    """Update a group's metadata fields.

    Merges non-None fields from *data* into the group YAML atomically.
    Only ``name`` and ``description`` are editable.

    Args:
        group_id: Group id.
        data: Request with optional fields to update.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The updated group as a ``GroupResponse``.

    Raises:
        ValueError: If the group file does not exist or is corrupted.
    """
    group_path = _group_path(group_id, source)

    if not group_path.exists():
        raise ValueError(f"Group with id '{group_id}' not found")

    group_data = _load_group_file(str(group_path))
    if group_data is None:
        raise ValueError(f"Group file '{group_id}' is corrupted or empty")

    changed_fields: list[str] = []

    for field_name in ("name", "description"):
        value = getattr(data, field_name)
        if value is not None:
            group_data[field_name] = value
            changed_fields.append(field_name)

    _atomic_write_yaml(str(group_path), group_data)

    if changed_fields:
        logger.info(
            "Updated group '%s': changed fields=%s",
            group_id,
            changed_fields,
        )
    else:
        logger.info("No fields changed for group '%s'", group_id)

    return _group_to_response(group_id, group_data)


def update_group_members(
    group_id: str,
    data: UpdateGroupMembersRequest,
    source: str = SOURCE_CODE,
) -> GroupResponse:
    """Update the ``members`` list of a group.

    Patches the ``members`` array by adding and/or removing node IDs
    atomically. Added members must exist as nodes and must not be
    group ids (no nesting).

    Args:
        group_id: Group id.
        data: Request with ``add`` and ``remove`` lists.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The updated group as a ``GroupResponse``.

    Raises:
        ValueError: If the group file does not exist or is corrupted,
                    a member node does not exist, or a group id is
                    passed as member.
    """
    group_path = _group_path(group_id, source)

    if not group_path.exists():
        raise ValueError(f"Group with id '{group_id}' not found")

    group_data = _load_group_file(str(group_path))
    if group_data is None:
        raise ValueError(f"Group file '{group_id}' is corrupted or empty")

    _validate_member_additions(data, source)

    members: list[str] = list(group_data.get("members") or [])

    if data.remove:
        members = [member for member in members if member not in data.remove]

    if data.add:
        for member in data.add:
            if member not in members:
                members.append(member)

    group_data["members"] = members
    _atomic_write_yaml(str(group_path), group_data)

    logger.info(
        "Updated members of group '%s': add=%s, remove=%s",
        group_id,
        data.add,
        data.remove,
    )

    return _group_to_response(group_id, group_data)


# ── Helpers ───────────────────────────────────────────────────────────────


def _validate_member_additions(data: UpdateGroupMembersRequest, source: str = SOURCE_CODE) -> None:
    """Validate that added members exist as nodes and are not group ids.

    Args:
        data: Members request whose ``add`` list is validated.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Raises:
        ValueError: If a member does not exist as node or is a group id.
    """
    if not data.add:
        return

    store = ArchitectureStore(source)
    nodes_dir = store.nodes_dir()
    groups_dir = store.groups_dir()

    for member in data.add:
        if (groups_dir / f"{member}.yml").exists():
            raise ValueError(f"Member id '{member}' is a group — groups cannot be members")
        if not (nodes_dir / f"{member}.yml").exists():
            raise ValueError(f"Member id '{member}' does not exist as a node")


def _group_to_response(group_id: str, data: dict[str, Any]) -> GroupResponse:
    """Convert a raw group dict + id into a GroupResponse.

    Backward-compat: if the ``members`` field is missing, an empty
    list is returned.
    """
    raw_members = data.get("members")
    members = [str(member) for member in raw_members] if isinstance(raw_members, list) else []
    return GroupResponse(
        id=data.get("id", group_id),
        name=data.get("name", group_id),
        description=data.get("description", ""),
        members=members,
    )

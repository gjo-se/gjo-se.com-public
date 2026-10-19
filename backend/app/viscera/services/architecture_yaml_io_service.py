"""Low-level YAML I/O primitives for the architecture store.

Owns the shared comment-preserving ``ruamel.yaml`` instance and the
file-level read/write/replace primitives (atomic writes via tempfile +
``os.replace``). The higher-level object/edge CRUD lives in
:mod:`app.viscera.services.architecture_service`, the merge in
:mod:`app.viscera.services.architecture_merge_service` and the collection loading in
:mod:`app.viscera.services.architecture_objects_service`.
"""

from __future__ import annotations

import contextlib
import os
import tempfile
from pathlib import Path
from typing import Any

from ruamel.yaml import YAML

# ── ruamel.yaml instance (comment-preserving) ──────────────────────────────

_yaml = YAML()
_yaml.default_flow_style = False
_yaml.allow_unicode = True
_yaml.preserve_quotes = True


def _atomic_write_yaml(filepath: str, data: object) -> None:
    """Write data to a YAML file atomically.

    Writes to a temporary file in the same directory first, then
    uses ``os.replace`` to swap it in. This guarantees the file
    is never left in a half-written state if the process crashes.

    Uses ``ruamel.yaml`` which preserves comments, field order,
    and quote style from the original file.
    """
    tmp_fd: int | None = None
    tmp_path: str | None = None
    try:
        dirname = os.path.dirname(filepath)
        os.makedirs(dirname, exist_ok=True)
        tmp_fd, tmp_path = tempfile.mkstemp(dir=dirname, suffix=".yml")
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as fh:
            _yaml.dump(data, fh)
        os.replace(tmp_path, filepath)
        tmp_path = None  # os.replace succeeded — don't clean up
    finally:
        if tmp_path is not None:
            with contextlib.suppress(OSError):
                os.unlink(tmp_path)


def _load_yaml_file(filepath: str) -> object | None:
    """Load a YAML file using comment-preserving ruamel.yaml."""
    with open(filepath, encoding="utf-8") as fh:
        return _yaml.load(fh)


def _try_update_in_file(filepath: str, object_id: str, field: str, value: object) -> dict[str, Any] | None:
    """Attempt to find and update the object in a single YAML file.

    Returns the updated object dict on success, or ``None`` if the object
    is not found in this file.
    """
    with open(filepath, encoding="utf-8") as fh:
        data = _yaml.load(fh)

    if data is None:
        return None

    # Handle list-based files
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and item.get("id") == object_id:
                item[field] = value
                _atomic_write_yaml(filepath, data)
                return dict(item)
        return None

    # Handle dict-based files: top-level ID match only (flat structure)
    if isinstance(data, dict) and data.get("id") == object_id:
        data[field] = value
        _atomic_write_yaml(filepath, data)
        return dict(data)

    return None


def _try_replace_object_in_file(filepath: str, object_id: str, new_object: dict[str, Any]) -> bool:
    """Try to replace an object in a single YAML file by its ID.

    Returns ``True`` if the object was found and replaced, ``False`` otherwise.
    """
    with open(filepath, encoding="utf-8") as fh:
        data = _yaml.load(fh)

    if data is None:
        return False

    # Handle list-based files
    if isinstance(data, list):
        for i, item in enumerate(data):
            if isinstance(item, dict) and item.get("id") == object_id:
                data[i] = new_object
                _atomic_write_yaml(filepath, data)
                return True
        return False

    # Handle dict-based files: top-level ID match only (flat structure)
    if isinstance(data, dict) and data.get("id") == object_id:
        data.clear()
        data.update(new_object)
        _atomic_write_yaml(filepath, data)
        return True

    return False


def _walk_yaml_files(arch_root: Path) -> list[str]:
    """Return all ``.yml`` file paths under *arch_root*.

    Excludes ``workspace.yml`` (the workspace container: root metadata,
    edges, styles). It is not an individual object file — its ``id``
    (``gjo-se.com``) collides with the real system object in ``nodes/``
    and object writes must not land in the container.
    """
    result: list[str] = []
    root_abs = os.path.abspath(arch_root)
    workspace_file = os.path.abspath(arch_root / "workspace.yml")
    for dirpath, _dirnames, filenames in os.walk(arch_root):
        for filename in filenames:
            if not filename.endswith(".yml"):
                continue
            full_path = os.path.join(dirpath, filename)
            if os.path.abspath(full_path) == workspace_file:
                continue
            # Sicherheitsnetz: nie die Container-Datei als Objekt-Write-Ziel.
            if os.path.abspath(dirpath) == root_abs and filename == "workspace.yml":
                continue
            result.append(full_path)
    return result

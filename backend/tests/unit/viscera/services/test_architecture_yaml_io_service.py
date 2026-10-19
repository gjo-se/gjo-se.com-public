"""Unit-Tests für die Low-Level-YAML-I/O-Primitive (architecture_yaml_io_service).

Testet den atomaren Write, den In-Place-Update/-Replace einer Objektdatei und
das Datei-Walking. Nutzt ausschließlich temporäre Dateien – kein Netz, keine DB.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any

import pytest
import yaml as pyyaml  # nur zum Lesen der Rohdaten in Assertions

from app.viscera.services.architecture_yaml_io_service import (
    _atomic_write_yaml,
    _try_replace_object_in_file,
    _try_update_in_file,
    _walk_yaml_files,
)

pytestmark = pytest.mark.unit


def _read_file(filepath: str) -> str:
    """Liest eine Datei als String."""
    with open(filepath, encoding="utf-8") as f:
        return f.read()


def _read_yaml(filepath: str) -> Any:
    """Liest YAML mit PyYAML (für Assertions – prüft Rohstruktur)."""
    with open(filepath, encoding="utf-8") as f:
        return pyyaml.safe_load(f)


class TestAtomicWriteYaml:
    """Tests für _atomic_write_yaml."""

    def test_writes_data_correctly(self) -> None:
        """Atomarer Write schreibt korrekte Daten."""
        data = {"key": "value", "list": [1, 2, 3]}
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False) as f:
            f.write("old: data\n")
            tmp_path = f.name

        try:
            _atomic_write_yaml(tmp_path, data)
            result = _read_yaml(tmp_path)
            assert result == data
        finally:
            os.unlink(tmp_path)

    def test_preserves_comments_in_roundtrip(self) -> None:
        """Nach Write+Re-Read bleiben Kommentare erhalten."""
        original = "# Header comment\nkey: value  # inline comment\nlist:\n  - a\n  - b\n"
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False) as f:
            f.write(original)
            tmp_path = f.name

        try:
            # Re-read with ruamel.yaml, modify, write
            from ruamel.yaml import YAML

            yml = YAML()
            yml.preserve_quotes = True
            with open(tmp_path, encoding="utf-8") as fh:
                data = yml.load(fh)
            data["key"] = "modified"
            _atomic_write_yaml(tmp_path, data)

            content = _read_file(tmp_path)
            assert "# Header comment" in content
            assert "# inline comment" in content
            assert "modified" in content
        finally:
            os.unlink(tmp_path)


def test_try_update_in_file_updates_matching_list_item(tmp_path: Path) -> None:
    """A matching list entry is updated in place and returned."""
    filepath = tmp_path / "nodes.yml"
    _atomic_write_yaml(str(filepath), [{"id": "x", "name": "old"}, {"id": "y", "name": "keep"}])

    result = _try_update_in_file(str(filepath), "x", "name", "new")

    assert result == {"id": "x", "name": "new"}
    assert _read_yaml(str(filepath))[0]["name"] == "new"
    assert _read_yaml(str(filepath))[1]["name"] == "keep"


def test_try_update_in_file_returns_none_without_match(tmp_path: Path) -> None:
    """No matching id yields None and leaves the file untouched."""
    filepath = tmp_path / "nodes.yml"
    _atomic_write_yaml(str(filepath), [{"id": "y"}])

    assert _try_update_in_file(str(filepath), "x", "name", "new") is None


def test_try_update_in_file_updates_matching_dict(tmp_path: Path) -> None:
    """A flat dict file with a matching top-level id is updated."""
    filepath = tmp_path / "obj.yml"
    _atomic_write_yaml(str(filepath), {"id": "x", "name": "old"})

    assert _try_update_in_file(str(filepath), "x", "name", "new") == {"id": "x", "name": "new"}


def test_try_update_in_file_empty_document_returns_none(tmp_path: Path) -> None:
    """An empty YAML document is treated as no match."""
    filepath = tmp_path / "empty.yml"
    filepath.write_text("", encoding="utf-8")

    assert _try_update_in_file(str(filepath), "x", "name", "new") is None


def test_try_replace_object_in_file_replaces_list_item(tmp_path: Path) -> None:
    """A matching list entry is replaced and True is returned."""
    filepath = tmp_path / "nodes.yml"
    _atomic_write_yaml(str(filepath), [{"id": "x", "name": "old"}])

    assert _try_replace_object_in_file(str(filepath), "x", {"id": "x", "name": "new"}) is True
    assert _read_yaml(str(filepath)) == [{"id": "x", "name": "new"}]


def test_try_replace_object_in_file_false_without_match(tmp_path: Path) -> None:
    """No matching id yields False."""
    filepath = tmp_path / "nodes.yml"
    _atomic_write_yaml(str(filepath), [{"id": "y"}])

    assert _try_replace_object_in_file(str(filepath), "x", {"id": "x"}) is False


def test_try_replace_object_in_file_replaces_dict_clearing_stale_fields(tmp_path: Path) -> None:
    """A matching flat dict is cleared and updated (stale fields removed)."""
    filepath = tmp_path / "obj.yml"
    _atomic_write_yaml(str(filepath), {"id": "x", "name": "old", "stale": 1})

    assert _try_replace_object_in_file(str(filepath), "x", {"id": "x", "name": "new"}) is True
    assert _read_yaml(str(filepath)) == {"id": "x", "name": "new"}


def test_walk_yaml_files_excludes_workspace_and_non_yaml(tmp_path: Path) -> None:
    """The workspace container and non-yml files are excluded from the walk."""
    (tmp_path / "workspace.yml").write_text("id: ws\n", encoding="utf-8")
    (tmp_path / "b.txt").write_text("x", encoding="utf-8")
    nodes = tmp_path / "nodes"
    nodes.mkdir()
    (nodes / "a.yml").write_text("id: a\n", encoding="utf-8")

    names = {Path(p).name for p in _walk_yaml_files(tmp_path)}

    assert names == {"a.yml"}

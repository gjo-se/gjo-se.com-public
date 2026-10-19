"""Unit-Tests für das Laden von Objekt-Sammlungen (architecture_objects_service).

Deckt die Klassifikation von Node-/Edge-/Diagram-Dateien und die
``description``-Normalisierung von ``list_all_objects`` ab. Kein Netz, keine DB.
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from app.viscera.services import architecture_objects_service
from app.viscera.services.architecture_merge_service import _object_key
from app.viscera.services.architecture_objects_service import _load_objects_from_dir, list_all_objects

pytestmark = pytest.mark.unit


def test_load_objects_from_dir_classifies_entries(tmp_path: Path) -> None:
    """Nodes, edges and diagrams are recognised and given a merge key."""
    (tmp_path / "node.yml").write_text("id: n1\nname: N\n", encoding="utf-8")
    (tmp_path / "edge.yml").write_text("from: a\nto: b\n", encoding="utf-8")
    (tmp_path / "diag.yml").write_text("key: D1\nname: d\n", encoding="utf-8")
    (tmp_path / "legacy.yml").write_text("name: L\ntype: container\n", encoding="utf-8")

    objects = _load_objects_from_dir(tmp_path)["nodes"]

    keys = {_object_key(obj) for obj in objects}
    assert keys == {"n1", "a__b", "D1", "legacy"}


def test_load_objects_from_dir_returns_empty_for_missing_dir(tmp_path: Path) -> None:
    """A non-existent directory yields no objects."""
    assert _load_objects_from_dir(tmp_path / "missing")["nodes"] == []


def test_load_objects_from_dir_skips_invalid_and_non_dict(tmp_path: Path) -> None:
    """Invalid YAML and non-mapping files are skipped."""
    (tmp_path / "bad.yml").write_text("foo: 'bar", encoding="utf-8")
    (tmp_path / "list.yml").write_text("- a\n- b\n", encoding="utf-8")

    assert _load_objects_from_dir(tmp_path)["nodes"] == []


def test_list_all_objects_normalizes_missing_description(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Missing ``description`` fields are normalised to an empty string."""
    nodes_dir = tmp_path / "nodes"
    nodes_dir.mkdir()
    (nodes_dir / "a.yml").write_text("id: a\nname: A\n", encoding="utf-8")
    monkeypatch.setattr(
        architecture_objects_service,
        "ArchitectureStore",
        lambda _source=architecture_objects_service.SOURCE_CODE: SimpleNamespace(nodes_dir=lambda: nodes_dir),
    )

    objects: list[dict[str, Any]] = list_all_objects()

    assert objects[0]["description"] == ""

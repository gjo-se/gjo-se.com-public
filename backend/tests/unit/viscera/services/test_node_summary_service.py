"""Unit tests for the node-summary docstring collection.

Builds a minimal architecture tree (``imports/backend.json`` + module files) in
a tmp directory and verifies the L3/L4 docstring resolution and node existence
check. No LLM call and no DB.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.viscera.services import node_summary_service

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def _build_arch_root(tmp_path: Path) -> Path:
    """Create a minimal architecture tree and return the ``architecture/`` root."""
    arch = tmp_path / "architecture"
    imports = arch / "_pipeline" / "imports"
    imports.mkdir(parents=True)
    (imports / "backend.json").write_text(
        '{"backend": {"modules": ['
        '{"name": "app.a", "path": "backend/app/a.py", "top_level": "app.comp"},'
        '{"name": "app.b", "path": "backend/app/b.py", "top_level": "app.comp"}'
        "]}}",
        encoding="utf-8",
    )
    app_dir = tmp_path / "backend" / "app"
    app_dir.mkdir(parents=True)
    (app_dir / "a.py").write_text('"""Docstring A."""\n', encoding="utf-8")
    (app_dir / "b.py").write_text('"""Docstring B."""\n', encoding="utf-8")
    return arch


def test_collect_node_docstrings_for_module_returns_own_docstring(tmp_path: Path) -> None:
    """An L4 module id resolves to its own docstring."""
    arch = _build_arch_root(tmp_path)

    docstrings = node_summary_service.collect_node_docstrings(arch, "app.a")

    assert docstrings == ["Docstring A."]


def test_collect_node_docstrings_for_top_level_returns_sorted_child_docstrings(tmp_path: Path) -> None:
    """An L3 top_level collects the child-module docstrings, sorted by name."""
    arch = _build_arch_root(tmp_path)

    docstrings = node_summary_service.collect_node_docstrings(arch, "app.comp")

    assert docstrings == ["Docstring A.", "Docstring B."]


def test_collect_node_docstrings_for_unknown_node_is_empty(tmp_path: Path) -> None:
    """An unknown node id yields no docstrings."""
    arch = _build_arch_root(tmp_path)

    assert node_summary_service.collect_node_docstrings(arch, "does.not.exist") == []


def test_node_exists_accepts_module_and_top_level(tmp_path: Path) -> None:
    """Known module names and top_levels exist; unknown ids do not."""
    arch = _build_arch_root(tmp_path)

    assert node_summary_service.node_exists(arch, "app.a") is True
    assert node_summary_service.node_exists(arch, "app.comp") is True
    assert node_summary_service.node_exists(arch, "unknown") is False

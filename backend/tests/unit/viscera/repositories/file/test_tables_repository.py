"""Unit tests for the canonical ``tables[]`` persistence.

Covers the target path/filename, the payload shape and the deterministic
(byte-identical) JSON serialization.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.viscera.repositories.file.tables_repository import write_tables

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def test_write_tables_writes_base_payload_to_pipeline_dir(tmp_path: Path) -> None:
    """The artifact lands under ``_pipeline/tables/<base>.json`` with base + tables."""
    tables = [{"name": "crm_company", "columns": [], "fks": []}]

    path = write_tables(tmp_path, "app", tables)

    assert path == tmp_path / "_pipeline" / "tables" / "app.json"
    assert path.read_text(encoding="utf-8") == (
        '{\n  "base": "app",\n  "tables": [\n    {\n      "columns": [],\n'
        '      "fks": [],\n      "name": "crm_company"\n    }\n  ]\n}\n'
    )


def test_write_tables_uses_filename_key_override(tmp_path: Path) -> None:
    """An explicit ``filename_key`` selects the file, ``base_key`` the payload base."""
    path = write_tables(tmp_path, "app", [], filename_key="override")

    assert path.name == "override.json"
    assert '"base": "app"' in path.read_text(encoding="utf-8")


def test_write_tables_is_deterministic_across_runs(tmp_path: Path) -> None:
    """Two runs over the same input produce byte-identical output."""
    tables = [{"name": "b"}, {"name": "a"}]

    first = write_tables(tmp_path, "app", tables).read_text(encoding="utf-8")
    second = write_tables(tmp_path, "app", tables).read_text(encoding="utf-8")

    assert first == second

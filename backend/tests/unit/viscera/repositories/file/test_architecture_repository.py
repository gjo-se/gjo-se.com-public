"""Unit tests for the architecture storage boundary (path resolution).

Covers source validation, the golden sub-world resolution and the well-known
collection directories of :class:`ArchitectureStore`. Pure path logic – no I/O.
"""

from __future__ import annotations

import pytest

from app.viscera.repositories.file.architecture_repository import (
    ARCHITECTURE_SOURCES,
    SOURCE_CODE,
    SOURCE_GOLDEN,
    ArchitectureStore,
    resolve_architecture_dir,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def test_resolve_architecture_dir_rejects_unknown_source() -> None:
    """An unknown source raises a ValueError naming the valid values."""
    with pytest.raises(ValueError, match="Unknown architecture source"):
        resolve_architecture_dir("bogus")


def test_resolve_architecture_dir_golden_is_subdir_of_code() -> None:
    """The golden world lives beneath the live architecture root."""
    code_root = resolve_architecture_dir(SOURCE_CODE)
    golden_root = resolve_architecture_dir(SOURCE_GOLDEN)

    assert golden_root == code_root / "golden"


def test_store_collection_dirs_are_root_relative() -> None:
    """The store exposes the well-known collection directories."""
    store = ArchitectureStore()

    assert store.nodes_dir() == store.root() / "nodes"
    assert store.edges_dir() == store.root() / "edges"
    assert store.groups_dir() == store.root() / "groups"
    assert store.diagrams_dir() == store.root() / "diagrams"
    assert store.workspace_path() == store.root() / "workspace.yml"


def test_architecture_sources_contains_code_and_golden() -> None:
    """Only ``code`` and ``golden`` are valid sources."""
    assert frozenset({SOURCE_CODE, SOURCE_GOLDEN}) == ARCHITECTURE_SOURCES

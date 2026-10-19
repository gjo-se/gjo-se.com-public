"""Unit tests for the pure ``Base.metadata`` → ``tables[]`` mapper.

Covers the domain derivation from a dotted module path and the canonical,
deterministic mapping of a small ``MetaData`` (columns, indexes, defaults,
foreign keys, sorted table order).
"""

from __future__ import annotations

import pytest
from sqlalchemy import Column, ForeignKey, Integer, MetaData, String, Table

from app.viscera.domain.tables_rules import _default_str, derive_domain, map_metadata

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def test_derive_domain_returns_first_segment_below_base_root() -> None:
    """The domain is the first path segment after the base root."""
    assert derive_domain("app.portfolio.models.project", "app") == "portfolio"
    assert derive_domain("app.shared.tagging.models.tag", "app") == "shared"


def test_derive_domain_without_matching_prefix_uses_first_segment() -> None:
    """A module outside the base root falls back to its first segment."""
    assert derive_domain("other.pkg.mod", "app") == "other"


def test_default_str_is_stable_for_callables() -> None:
    """Callable defaults are rendered by name (no memory address)."""
    assert _default_str(len) == "len"
    assert _default_str(0) == "0"


def test_map_metadata_maps_columns_indexes_and_fks() -> None:
    """The mapper emits canonical tables with columns, indexes and sorted FKs."""
    metadata = MetaData()
    Table("parent", metadata, Column("id", Integer, primary_key=True))
    Table(
        "child",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("name", String(64), nullable=True, index=True),
        Column("parent_id", Integer, ForeignKey("parent.id"), nullable=False),
    )

    tables = map_metadata(metadata, "app", {"parent": "core", "child": "crm"})

    assert [table["name"] for table in tables] == ["child", "parent"]
    child = tables[0]
    assert child["base"] == "app"
    assert child["domain"] == "crm"
    name_col = next(col for col in child["columns"] if col["name"] == "name")
    assert name_col["type"] == "varchar(64)"
    assert name_col["nullable"] is True
    assert name_col["indexes"] == ["ix_child_name"]
    assert child["fks"] == [{"column": "parent_id", "ref_table": "parent", "ref_column": "id"}]


def test_map_metadata_includes_comment_only_when_present() -> None:
    """A column ``comment`` is emitted only when set (else the key is absent)."""
    metadata = MetaData()
    Table(
        "t",
        metadata,
        Column("with_comment", Integer, primary_key=True, comment="hello"),
        Column("without_comment", Integer),
    )

    tables = map_metadata(metadata, "app", {})
    by_name = {col["name"]: col for col in tables[0]["columns"]}

    assert by_name["with_comment"]["comment"] == "hello"
    assert "comment" not in by_name["without_comment"]


def test_map_metadata_includes_default_only_when_present() -> None:
    """A column ``default`` is emitted only when a static default is set."""
    metadata = MetaData()
    Table(
        "t",
        metadata,
        Column("with_default", Integer, primary_key=True, default=7),
        Column("without_default", Integer),
    )

    tables = map_metadata(metadata, "app", {})
    by_name = {col["name"]: col for col in tables[0]["columns"]}

    assert by_name["with_default"]["default"] == "7"
    assert "default" not in by_name["without_default"]

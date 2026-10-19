"""Unit tests for the TechnologyImportRun model metadata."""

from __future__ import annotations

import pytest

from app.shared.technology_catalog.models.technology_import_run import TechnologyImportRun

pytestmark = pytest.mark.unit


def test_technology_import_run_uses_expected_table_name() -> None:
    """The audit model maps to the shared_technology_import_run table."""
    assert TechnologyImportRun.__tablename__ == "shared_technology_import_run"


def test_technology_import_run_started_at_and_status_are_required() -> None:
    """The audit row always carries a start time and a status."""
    table = TechnologyImportRun.__table__

    assert table.c.started_at.nullable is False
    assert table.c.status.nullable is False

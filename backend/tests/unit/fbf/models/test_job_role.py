"""Unit tests for the JobRole ORM model (fbf_job_role)."""

from __future__ import annotations

import pytest

from app.fbf.models.job_role import JobRole

pytestmark = pytest.mark.unit


def test_job_role_maps_to_fbf_job_role_table() -> None:
    """The model is bound to the ``fbf_job_role`` table."""
    assert JobRole.__tablename__ == "fbf_job_role"


def test_name_is_unique_and_indexed() -> None:
    """``name`` is globally unique and indexed (curation key)."""
    column = JobRole.__table__.c.name

    assert column.unique is True
    assert column.index is True
    assert column.nullable is False

"""Unit tests for the ProjectEndcustomerCandidate ORM model + source enum."""

from __future__ import annotations

import pytest

from app.fbf.models.project_endcustomer_candidate import (
    EndcustomerCandidateSource,
    ProjectEndcustomerCandidate,
)

pytestmark = pytest.mark.unit


def test_candidate_maps_to_fbf_project_endcustomer_candidate_table() -> None:
    """The model is bound to the ``fbf_project_endcustomer_candidate`` table."""
    assert ProjectEndcustomerCandidate.__tablename__ == "fbf_project_endcustomer_candidate"


def test_project_fk_cascades_on_delete() -> None:
    """Removing the project removes its candidates (ON DELETE CASCADE)."""
    foreign_key = next(iter(ProjectEndcustomerCandidate.__table__.foreign_keys))

    assert foreign_key.target_fullname == "fbf_project.id"
    assert foreign_key.ondelete == "CASCADE"


def test_source_enum_covers_brave_tavily_both() -> None:
    """``EndcustomerCandidateSource`` exposes exactly brave/tavily/both."""
    assert {member.value for member in EndcustomerCandidateSource} == {"brave", "tavily", "both"}


def test_confidence_and_source_columns_documented() -> None:
    """``source`` and ``confidence`` are both required columns."""
    assert ProjectEndcustomerCandidate.__table__.c.source.nullable is False
    assert ProjectEndcustomerCandidate.__table__.c.confidence.nullable is False

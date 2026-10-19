"""Unit-Tests fuer ProjectFreelancerMap ORM-Model."""

import pytest

from app.fbf.models.project_freelancer_map import ProjectFreelancerMap


@pytest.mark.unit
def test_canonical_project_id_removed_from_pm() -> None:
    """canonical_project_id und similarity_score existieren NICHT mehr auf ProjectFreelancerMap."""
    assert "canonical_project_id" not in ProjectFreelancerMap.__table__.c
    assert "similarity_score" not in ProjectFreelancerMap.__table__.c

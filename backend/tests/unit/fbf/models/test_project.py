"""Unit-Tests fuer Project ORM-Model."""

import pytest

from app.fbf.models.project import Project
from app.fbf.schemas.project_schemas import ProjectOut


@pytest.mark.unit
def test_canonical_id_exists_on_project() -> None:
    """canonical_id (Self-FK) existiert auf Project."""
    assert "canonical_id" in Project.__table__.c
    assert hasattr(Project, "canonical_id") is True


@pytest.mark.unit
def test_project_out_has_canonical_id() -> None:
    """ProjectOut hat canonical_id + similarity_score Felder."""
    assert "canonical_id" in ProjectOut.model_fields
    assert "similarity_score" in ProjectOut.model_fields
    assert "contact_count" not in ProjectOut.model_fields
    assert "linked_count" not in ProjectOut.model_fields
    assert "linked_entries" not in ProjectOut.model_fields
    assert "admin_credential_id" not in ProjectOut.model_fields
    assert "external_id" not in ProjectOut.model_fields

"""Unit tests for the Submission ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.submission import Submission
from tests.unit.application.models._contract import (
    column_names,
    foreign_key_for_column,
)

pytestmark = pytest.mark.unit


def test_submission_maps_to_expected_table() -> None:
    """The model is bound to ``application_submission``."""
    assert Submission.__tablename__ == "application_submission"


def test_submission_language_defaults_to_german() -> None:
    """A new submission defaults to German mail language."""
    assert Submission.__table__.c.language.server_default.arg == "de"


def test_submission_current_flag_defaults_to_true() -> None:
    """A freshly created submission is the current one."""
    assert Submission.__table__.c.is_current.nullable is False
    assert Submission.__table__.c.is_current.server_default is not None


def test_submission_references_project_and_sender_profile() -> None:
    """The submission links a project and the sender profile."""
    project_target, project_ondelete = foreign_key_for_column(Submission, "project_id")
    profile_target, _profile_ondelete = foreign_key_for_column(Submission, "sender_profile_id")

    assert project_target == "fbf_project.id"
    assert project_ondelete == "CASCADE"
    assert profile_target == "application_profile.id"


def test_submission_owns_documents_and_communications() -> None:
    """Documents and communications belong to the submission and cascade."""
    assert {"documents", "communications"} <= set(Submission.__mapper__.relationships.keys())
    assert {"created_at", "updated_at"} <= column_names(Submission)

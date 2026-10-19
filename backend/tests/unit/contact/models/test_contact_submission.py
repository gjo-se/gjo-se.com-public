"""Unit tests for the ``ContactSubmission`` ORM model metadata (no DB).

Covers the table mapping, the persist-first defaults (``is_spam`` False,
``lang`` German) and the intentionally missing ``updated_at`` (submissions are
never edited). Pure mapper inspection – no session.
"""

from __future__ import annotations

import pytest

from app.contact.models.contact_submission import ContactSubmission

pytestmark = pytest.mark.unit


def test_contact_submission_maps_to_expected_table_name() -> None:
    """The submissions table is named ``contact_submission`` (singular)."""
    assert ContactSubmission.__tablename__ == "contact_submission"


def test_contact_submission_lang_defaults_to_german() -> None:
    """A submission without an explicit language is treated as German."""
    lang_col = ContactSubmission.__table__.columns["lang"]

    assert lang_col.nullable is False
    assert lang_col.default.arg == "de"


def test_contact_submission_defaults_to_not_spam() -> None:
    """New rows are persisted as ham unless classified otherwise."""
    spam_col = ContactSubmission.__table__.columns["is_spam"]

    assert spam_col.nullable is False
    assert spam_col.default.arg is False


def test_contact_submission_optional_fields_are_nullable() -> None:
    """``page``, ``ip`` and ``spam_reason`` may be absent."""
    columns = ContactSubmission.__table__.columns

    assert columns["page"].nullable is True
    assert columns["ip"].nullable is True
    assert columns["spam_reason"].nullable is True


def test_contact_submission_has_no_updated_at_column() -> None:
    """Submissions are write-once – there is no ``updated_at``."""
    assert "updated_at" not in ContactSubmission.__table__.columns
    assert "created_at" in ContactSubmission.__table__.columns

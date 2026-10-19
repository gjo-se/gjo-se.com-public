"""Unit tests for the Document ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.document import (
    ApplicationDocumentKind,
    Document,
)

pytestmark = pytest.mark.unit


def test_document_maps_to_expected_table() -> None:
    """The model is bound to ``application_document``."""
    assert Document.__tablename__ == "application_document"


def test_document_defaults_to_cv_kind() -> None:
    """A new document is a CV unless stated otherwise."""
    assert Document.__table__.c.kind.default.arg == ApplicationDocumentKind.CV


def test_document_storage_key_is_unique_and_required() -> None:
    """The storage key is the unique SSOT for the object-store object."""
    column = Document.__table__.c.storage_key

    assert column.unique is True
    assert column.nullable is False


def test_document_cascades_with_its_submission() -> None:
    """Deleting the submission removes its generated documents."""
    foreign_key = next(fk for fk in Document.__table__.foreign_keys if fk.parent.name == "application_submission_id")

    assert foreign_key.target_fullname == "application_submission.id"
    assert foreign_key.ondelete == "CASCADE"

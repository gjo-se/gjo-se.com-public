"""Integration tests for the document repository (real Postgres)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.document import (
    ApplicationDocumentKind,
    Document,
)
from app.application.models.submission import Submission
from app.application.repositories import document_repository

pytestmark = pytest.mark.integration

_CREATED_AT = datetime(2026, 1, 1, tzinfo=UTC)
_GENERATED_AT = datetime(2026, 1, 1, tzinfo=UTC)
_CHECKSUM = "0" * 64


async def _persist_document(
    db: AsyncSession,
    submission: Submission,
    *,
    storage_key: str,
    created_at: datetime,
    kind: str = ApplicationDocumentKind.CV,
) -> Document:
    """Persist a document row directly (arrangement for the read paths)."""
    document = Document(
        application_submission_id=submission.id,
        kind=kind,
        storage_key=storage_key,
        filename="lebenslauf.pdf",
        mime_type="application/pdf",
        size_bytes=1234,
        checksum_sha256=_CHECKSUM,
        generated_at=_GENERATED_AT,
        created_at=created_at,
    )
    db.add(document)
    await db.flush()
    return document


async def test_create_and_get_by_id_round_trips(db_session: AsyncSession, app_submission: Submission) -> None:
    """A created document is readable by its id."""
    created = await document_repository.create_cv_document(
        db_session,
        application_submission_id=app_submission.id,
        storage_key="k1",
        filename="lebenslauf.pdf",
        mime_type="application/pdf",
        size_bytes=1234,
        checksum_sha256=_CHECKSUM,
        generated_at=_GENERATED_AT,
    )

    fetched = await document_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.storage_key == "k1"


async def test_get_by_storage_key_resolves_the_object(db_session: AsyncSession, app_submission: Submission) -> None:
    """The unique storage key resolves its document."""
    await document_repository.create_cv_document(
        db_session,
        application_submission_id=app_submission.id,
        storage_key="key-abc",
        filename="lebenslauf.pdf",
        mime_type="application/pdf",
        size_bytes=1234,
        checksum_sha256=_CHECKSUM,
        generated_at=_GENERATED_AT,
    )

    fetched = await document_repository.get_by_storage_key(db_session, "key-abc")
    assert fetched is not None
    assert fetched.storage_key == "key-abc"
    assert await document_repository.get_by_storage_key(db_session, "missing") is None


async def test_get_by_id_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown id yields ``None``."""
    assert await document_repository.get_by_id(db_session, 999_999) is None


async def test_list_by_submission_orders_oldest_first(db_session: AsyncSession, app_submission: Submission) -> None:
    """Documents come back ordered by ``created_at`` ascending."""
    await _persist_document(db_session, app_submission, storage_key="neu", created_at=datetime(2026, 2, 1, tzinfo=UTC))
    await _persist_document(db_session, app_submission, storage_key="alt", created_at=_CREATED_AT)

    rows = await document_repository.list_by_submission(db_session, app_submission.id)

    assert [row.storage_key for row in rows] == ["alt", "neu"]


async def test_get_cv_by_submission_filters_to_cv_kind(db_session: AsyncSession, app_submission: Submission) -> None:
    """Only documents of kind ``cv`` are returned."""
    await _persist_document(db_session, app_submission, storage_key="cv", created_at=_CREATED_AT)
    await _persist_document(
        db_session,
        app_submission,
        storage_key="other",
        created_at=datetime(2026, 1, 2, tzinfo=UTC),
        kind="other",
    )

    rows = await document_repository.get_cv_by_submission(db_session, app_submission.id)

    assert [row.storage_key for row in rows] == ["cv"]

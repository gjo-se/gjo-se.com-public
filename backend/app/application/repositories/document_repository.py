"""Database access for application documents (gjo_se_com).

Reads and writes return ``DocumentOut`` DTOs (never ORM models) so the service
layer stays free of ``app.<ctx>.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from datetime import datetime
from typing import Any

from sqlalchemy import asc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.document import (
    ApplicationDocumentKind,
    Document,
)
from app.application.schemas.document_schemas import DocumentOut


def _to_out(document: Document) -> DocumentOut:
    """Maps a document ORM row to its DTO."""
    return DocumentOut.model_validate(document)


async def get_by_id(db: AsyncSession, document_id: int) -> DocumentOut | None:
    """Returns a single document by id as DTO or None."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    return _to_out(document) if document is not None else None


async def get_by_storage_key(db: AsyncSession, storage_key: str) -> DocumentOut | None:
    """Returns the document for an immutable ``storage_key`` as DTO or None.

    The key is the SSOT for the object-storage object, so this lookup powers
    download/stream endpoints.

    Args:
        db: Active async DB session.
        storage_key: The unique object-storage key.

    Returns:
        The matching document DTO or None if the key is unknown.
    """
    result = await db.execute(select(Document).where(Document.storage_key == storage_key))
    document = result.scalar_one_or_none()
    return _to_out(document) if document is not None else None


async def list_by_submission(db: AsyncSession, submission_id: int) -> list[DocumentOut]:
    """Returns all documents of a submission sorted by ``created_at`` ASC as DTOs."""
    result = await db.execute(
        select(Document).where(Document.application_submission_id == submission_id).order_by(asc(Document.created_at))
    )
    return [_to_out(document) for document in result.scalars().all()]


async def get_cv_by_submission(db: AsyncSession, submission_id: int) -> list[DocumentOut]:
    """Returns all CV documents of a submission sorted by ``created_at`` ASC.

    Filters :func:`list_by_submission` down to ``kind == cv`` – the CV snapshot
    is unique per submission (an older one is replaced on re-render), so this
    powers the "replace the previous CV" step.

    Args:
        db: Active async DB session.
        submission_id: The application_submission id.

    Returns:
        List of CV document DTOs of the submission.
    """
    result = await db.execute(
        select(Document)
        .where(
            Document.application_submission_id == submission_id,
            Document.kind == ApplicationDocumentKind.CV,
        )
        .order_by(asc(Document.created_at))
    )
    return [_to_out(document) for document in result.scalars().all()]


async def create_cv_document(
    db: AsyncSession,
    *,
    application_submission_id: int,
    storage_key: str,
    filename: str,
    mime_type: str,
    size_bytes: int,
    checksum_sha256: str,
    generated_at: datetime,
    render_context: dict[str, Any] | None = None,
) -> DocumentOut:
    """Builds and persists a new CV document, returning its DTO.

    Keeps the ORM class and the ``kind`` discriminator inside the repository.
    """
    document = Document(
        application_submission_id=application_submission_id,
        kind=ApplicationDocumentKind.CV,
        storage_key=storage_key,
        filename=filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        checksum_sha256=checksum_sha256,
        render_context=render_context,
        generated_at=generated_at,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return _to_out(document)


async def delete_by_id(db: AsyncSession, document_id: int) -> None:
    """Deletes a document by id."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if document is not None:
        await db.delete(document)
        await db.flush()

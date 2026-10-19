"""FastAPI router for the admin application-document download endpoint (gjo_se_com).

Exposes ``GET /documents/{document_id}/download`` which returns the stored CV
file of a document as a byte-exact download.

The download is served directly from the ObjectStore via the document's
``storage_key`` (SSOT). It deliberately does **not** go through the generic
``/stream`` route: CV objects are stored under private keys, which the public
stream route rejects with 404.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.repositories import document_repository
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.storage.domain.base_contract import ObjectNotFoundError
from app.shared.storage.infrastructure.factory_client import get_object_store

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/documents/{document_id}/download",
    response_class=Response,
    summary="Download the stored file of an application document (admin)",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "Document downloaded successfully",
        },
        404: {"description": "Document or stored object not found"},
    },
)
async def download_document(
    _: AdminUser,
    document_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> Response:
    """Returns the stored file of ``document_id`` as an attachment.

    Resolves the document via the repository, reads the bytes from the
    ObjectStore using ``storage_key`` as SSOT and returns them with the
    document's MIME type and filename.

    Raises:
        HTTPException: 404 if the document is unknown or the object is missing.
    """
    document = await document_repository.get_by_id(db, document_id)
    if document is None:
        logger.warning("application_document: document_id=%s not found", document_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nicht gefunden",
        )

    try:
        data = await get_object_store().get(document.storage_key)
    except ObjectNotFoundError as exc:
        logger.warning(
            "application_document: object missing for document_id=%s (storage_key=%s)",
            document_id,
            document.storage_key,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Objekt nicht gefunden: {document.storage_key}",
        ) from exc

    return Response(
        content=data,
        media_type=document.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"'},
    )

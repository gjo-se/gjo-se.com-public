"""Business logic for uploading portfolio proof images (gjo_se_com).

Validates the uploaded image (content type + size), persists it in the object
store under ``{portfolio_slug}/proof-{proof_id}.{ext}`` and updates the
``image_src`` of the matching proof row. All DB access is delegated to the
repositories (Achse 2: ``services`` > ``repositories``).
"""

import logging

from fastapi import UploadFile

from app.portfolio.domain.portfolio_contract import PortfolioRecord
from app.portfolio.exceptions import PortfolioNotFoundError
from app.portfolio.repositories import portfolio_proof_repository, portfolio_repository
from app.portfolio.services.portfolio_admin_service import require_proof
from app.shared.db_access.session_types import AsyncSession
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError
from app.shared.storage.infrastructure.factory_client import get_object_store

logger = logging.getLogger(__name__)

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# content_type → file extension used in the generated storage key.
ALLOWED_IMAGE_TYPES: dict[str, str] = {
    "image/svg+xml": ".svg",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


async def _require_portfolio(db: AsyncSession, portfolio_id: int) -> PortfolioRecord:
    """Returns the portfolio record for *portfolio_id* or raises a 404.

    Args:
        db: Active async DB session.
        portfolio_id: The portfolio id.

    Returns:
        The matching portfolio record.

    Raises:
        PortfolioNotFoundError: If no portfolio with *portfolio_id* exists.
    """
    portfolio = await portfolio_repository.get_record_by_id(db, portfolio_id)
    if portfolio is None:
        logger.warning("portfolio not found: portfolio_id=%s", portfolio_id)
        raise PortfolioNotFoundError(f"Portfolio mit id '{portfolio_id}' nicht gefunden")
    return portfolio


async def upload_proof_image(
    db: AsyncSession,
    portfolio_id: int,
    proof_id: int,
    file: UploadFile,
) -> str:
    """Validates and uploads a proof image, then stores its key in the DB.

    The file is persisted in the object store under
    ``{portfolio_slug}/proof-{proof_id}.{ext}`` (extension derived from the
    validated content type) and ``image_src`` of the proof row is updated.

    Args:
        db: Active async DB session.
        portfolio_id: The portfolio id.
        proof_id: The portfolio_proof id.
        file: The multipart-uploaded image file.

    Returns:
        The storage key under which the image was saved.

    Raises:
        PortfolioNotFoundError: If no portfolio with *portfolio_id* exists.
        ProofNotFoundError: If the proof does not belong to the portfolio.
        InvalidImageTypeError: If the content type is not SVG/PNG/JPEG/WebP.
        ImageTooLargeError: If the file exceeds 5 MB.
    """
    portfolio = await _require_portfolio(db, portfolio_id)
    await require_proof(db, portfolio_id, proof_id)

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        logger.warning("unsupported image content type: %s", file.content_type)
        raise InvalidImageTypeError(
            f"Nicht unterstützter Content-Type '{file.content_type}' – erlaubt sind SVG, PNG, JPEG und WebP"
        )

    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        logger.warning("image too large: size=%s", len(data))
        raise ImageTooLargeError("Bild darf maximal 5 MB groß sein")

    key = f"{portfolio.slug}/proof-{proof_id}{extension}"
    await get_object_store().put(key, data)
    await portfolio_proof_repository.set_image_src(db, proof_id, key)
    logger.info(
        "proof image uploaded: portfolio_id=%s proof_id=%s key=%s",
        portfolio_id,
        proof_id,
        key,
    )
    return key

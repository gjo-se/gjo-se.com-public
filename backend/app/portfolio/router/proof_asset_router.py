"""FastAPI admin router for portfolio proof assets (gjo_se_com).

Hosts the object-store asset listing (file picker) and the proof image upload.
All routes require an admin JWT via the ``AdminUser`` dependency and are
registered under ``/admin/portfolio``.

Routes:
    GET  /assets                                – list object-store assets (picker)
    POST /{portfolio_id}/proofs/{proof_id}/image – upload a proof image
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.exceptions import PortfolioNotFoundError, ProofNotFoundError
from app.portfolio.schemas.portfolio_image_schemas import PortfolioImageOut
from app.portfolio.services import portfolio_image_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError
from app.shared.storage.schemas.asset_schemas import AssetInfoOut
from app.shared.storage.services.asset_service import list_assets as list_central_assets

logger = logging.getLogger(__name__)

admin_router = APIRouter()


@admin_router.get(
    "/assets",
    response_model=list[AssetInfoOut],
    summary="List object-store assets (admin)",
)
async def list_assets(
    _: AdminUser,
    prefix: str = Query("", description="ObjectStore key prefix to filter by"),
) -> list[AssetInfoOut]:
    """List object-store assets matching *prefix* for the file picker.

    Returns the sorted matching assets, each with its storage ``key``, the
    original filename ``name`` and the upload timestamp ``createdAt``. Pass a
    prefix to narrow the list, e.g. a portfolio slug (``portfolio-slug/``).

    Delegates to the central asset listing so no listing logic is duplicated.
    """
    return await list_central_assets(prefix)


@admin_router.post(
    "/{portfolio_id}/proofs/{proof_id}/image",
    response_model=PortfolioImageOut,
    summary="Upload a proof image (admin)",
)
async def upload_proof_image(
    _: AdminUser,
    portfolio_id: int,
    proof_id: int,
    file: UploadFile,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PortfolioImageOut:
    """Uploads an image for a proof and returns the stored storage key.

    Only SVG/PNG/JPEG/WebP files up to 5 MB are accepted. The key is generated
    as ``{portfolio_slug}/proof-{proof_id}.{ext}``.

    Raises:
        404: Unknown portfolio or proof.
        413: File exceeds 5 MB.
        422: Unsupported content type.
    """
    try:
        key = await portfolio_image_service.upload_proof_image(db, portfolio_id, proof_id, file)
    except PortfolioNotFoundError as exc:
        logger.warning("proof image upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ProofNotFoundError as exc:
        logger.warning("proof image upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ImageTooLargeError as exc:
        logger.warning("proof image upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    except InvalidImageTypeError as exc:
        logger.warning("proof image upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return PortfolioImageOut(image_src=key)

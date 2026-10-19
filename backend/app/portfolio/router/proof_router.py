"""FastAPI admin router for the portfolio proof sub-resource (gjo_se_com).

Hosts the admin write API for managing the 1:N proofs of a portfolio project
(CRUD plus ordering). All routes require an admin JWT via the ``AdminUser``
dependency and are registered under ``/admin/portfolio``.

The proof image upload and the object-store asset listing live in
:mod:`proof_asset_router`.

Routes:
    GET    /{slug}/proofs                    – list proofs with statements
    POST   /{slug}/proofs                    – create a proof + statements (201)
    PUT    /{slug}/proofs/{proof_id}         – update a proof + replace statements
    DELETE /{slug}/proofs/{proof_id}         – delete a proof (204)
    PATCH  /{slug}/proofs/reorder            – set ``sort`` from ordered ids
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.exceptions import PortfolioNotFoundError, ProofNotFoundError
from app.portfolio.schemas.proof_schemas import (
    ProofAdminOut,
    ProofCreate,
    ProofReorderRequest,
    ProofUpdate,
)
from app.portfolio.services import portfolio_admin_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = logging.getLogger(__name__)

admin_router = APIRouter()


@admin_router.get(
    "/{slug}/proofs",
    response_model=list[ProofAdminOut],
    summary="List proofs of a portfolio (admin)",
)
async def list_proofs(
    _: AdminUser,
    slug: str,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ProofAdminOut]:
    """Returns a portfolio's proofs sorted by ``sort`` incl. statements; 404 on unknown slug."""
    try:
        return await portfolio_admin_service.list_proofs(db, slug)
    except PortfolioNotFoundError as exc:
        logger.warning("proof list failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@admin_router.post(
    "/{slug}/proofs",
    response_model=ProofAdminOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a proof (admin)",
)
async def create_proof(
    _: AdminUser,
    slug: str,
    body: ProofCreate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProofAdminOut:
    """Creates a proof + statements with auto-sort; 404 unknown slug, 422 missing DE statement."""
    try:
        proof = await portfolio_admin_service.create_proof(db, slug, body)
    except PortfolioNotFoundError as exc:
        logger.warning("proof create failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        logger.exception("proof create validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    await db.commit()
    return await _load_proof_admin_out(db, slug, proof.id)


@admin_router.patch(
    "/{slug}/proofs/reorder",
    response_model=list[ProofAdminOut],
    summary="Reorder proofs (admin)",
)
async def reorder_proofs(
    _: AdminUser,
    slug: str,
    body: ProofReorderRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ProofAdminOut]:
    """Sets ``sort`` from ``ordered_ids`` (index = sort) and returns the re-sorted list."""
    try:
        result = await portfolio_admin_service.reorder_proofs(db, slug, body)
    except PortfolioNotFoundError as exc:
        logger.warning("proof reorder failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    await db.commit()
    return result


@admin_router.put(
    "/{slug}/proofs/{proof_id}",
    response_model=ProofAdminOut,
    summary="Update a proof (admin)",
)
async def update_proof(
    _: AdminUser,
    slug: str,
    proof_id: int,
    body: ProofUpdate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProofAdminOut:
    """Updates a proof + replaces statements; 404 unknown, 422 missing DE statement."""
    try:
        proof = await portfolio_admin_service.update_proof(db, slug, proof_id, body)
    except PortfolioNotFoundError as exc:
        logger.warning("proof update failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ProofNotFoundError as exc:
        logger.warning("proof update failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        logger.exception("proof update validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    await db.commit()
    return await _load_proof_admin_out(db, slug, proof.id)


@admin_router.delete(
    "/{slug}/proofs/{proof_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a proof (admin)",
)
async def delete_proof(
    _: AdminUser,
    slug: str,
    proof_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Deletes a proof + statements (cascade); 404 unknown slug or proof."""
    try:
        await portfolio_admin_service.delete_proof(db, slug, proof_id)
    except PortfolioNotFoundError as exc:
        logger.warning("proof delete failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ProofNotFoundError as exc:
        logger.warning("proof delete failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    await db.commit()


async def _load_proof_admin_out(db: AsyncSession, slug: str, proof_id: int) -> ProofAdminOut:
    """Reloads a proof by id after commit and serializes it as admin DTO.

    Args:
        db: Active async DB session.
        slug: Slug of the owning portfolio.
        proof_id: The portfolio_proof id.

    Returns:
        A freshly loaded ProofAdminOut.
    """
    return await portfolio_admin_service.get_proof_admin(db, slug, proof_id)

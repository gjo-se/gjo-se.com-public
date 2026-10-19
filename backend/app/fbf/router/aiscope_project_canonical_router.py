"""Aiscope admin endpoints: project canonical linking and reference transfer."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.aiscope_router_schemas import (
    TransferReferencesRequest,
    TransferReferencesResponse,
)
from app.fbf.schemas.dedup_schemas import (
    SetCanonicalRequest,
    SetCanonicalResponse,
)
from app.fbf.services import (
    project_freelancer_map_service,
    project_service,
)
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.application import (
    ApplicationBridgePort,
    SubmissionMoveConflictError,
    get_application_bridge_port,
)
from app.shared.ports.crm_contact import CrmContactPort, get_crm_contact_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.post(
    "/projects/{project_id}/set-canonical",
    response_model=SetCanonicalResponse,
    status_code=status.HTTP_200_OK,
    summary="Project als Slave einem Master zuweisen (Admin)",
)
async def set_project_canonical_endpoint(
    project_id: int,
    body: SetCanonicalRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SetCanonicalResponse:
    """Links or unlinks a project directly via ``project.canonical_id``.

    Operates purely on the ``project`` table – freelancermap is never touched.
    Unlinking promotes the project to a standalone master; projects are never
    deleted. Linking requires the target to be a master itself; existing slaves
    of the degraded project are re-pointed to the new master so the grouping
    stays flat (exactly one level).

    Args:
        project_id: ID of the project to link/unlink.
        body: Request body with ``canonical_project_id`` (int to link, null to unlink).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        SetCanonicalResponse with status, project IDs and re-pointed slave IDs.

    Raises:
        HTTPException 404: Project or target master not found.
        HTTPException 400: A project cannot be its own master.
        HTTPException 400: Target project is not a master.
    """
    return await project_freelancer_map_service.set_project_canonical(db, project_id, body.canonical_project_id)


@router.post(
    "/projects/{project_id}/transfer-references",
    response_model=TransferReferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Referenzen eines alten Masters auf einen neuen Master uebertragen (Admin)",
)
async def transfer_project_references(
    project_id: int,
    body: TransferReferencesRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    application_bridge: ApplicationBridgePort = Depends(get_application_bridge_port),
    crm_port: CrmContactPort = Depends(get_crm_contact_port),
) -> TransferReferencesResponse:
    """Transfers status, CRM links and application from an old to a new master.

    Orchestrates the three transfers as one unit and commits once at the end:
    the project status moves to the target while the source becomes status-free,
    all ``project_crm_person`` links are re-pointed (duplicates resolved) and an
    existing ``application_submission`` is moved to the target.

    Args:
        project_id: ID of the new master (target).
        body: Request body with ``from_project_id`` (the old master).
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        TransferReferencesResponse with ``status_moved``, ``crm_links_moved`` and
        ``application_moved``.

    Raises:
        HTTPException 400: ``from_project_id`` equals the target project.
        HTTPException 404: Old master or target project not found.
        HTTPException 409: The target already has its own application submission.
    """
    from app.fbf.repositories import project_repository

    if body.from_project_id == project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_project_id must differ from the target project",
        )
    for pid in (project_id, body.from_project_id):
        if await project_repository.get_by_id(db, pid) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project {pid} not found",
            )

    status_moved = await project_service.move_status(db, body.from_project_id, project_id)
    crm_links_moved = await crm_port.move_project_links(db, body.from_project_id, project_id)
    try:
        application_moved = await application_bridge.move_submission(
            db, from_project_id=body.from_project_id, to_project_id=project_id
        )
    except SubmissionMoveConflictError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    await db.commit()
    logger.info(
        "Project references transferred: from=%s to=%s status=%s crm_links=%s application=%s",
        body.from_project_id,
        project_id,
        status_moved,
        crm_links_moved,
        application_moved,
    )
    return TransferReferencesResponse(
        status_moved=status_moved,
        crm_links_moved=crm_links_moved,
        application_moved=application_moved,
    )

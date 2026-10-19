"""FastAPI router for application communication history endpoints (gjo_se_com).

Admin:
    GET    /{submission_id}/communications       – List history (date DESC, incl. tags)
    POST   /{submission_id}/communications       – Create entry (201, incl. tag_ids)
    PUT    /communications/{comm_id}             – Partial update (incl. follow-up + tag_ids)
    DELETE /communications/{comm_id}             – Delete entry (204)

The routes only wire the communication history service; all business logic
(CRUD, tag writes via the polymorphic ``core_taggable`` junction, follow-up
fields) lives in :mod:`communication_service`.
"""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.schemas.communication_schemas import (
    CommunicationCreate,
    CommunicationOut,
    CommunicationUpdate,
)
from app.application.services import communication_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/{submission_id}/communications",
    response_model=list[CommunicationOut],
    summary="List the communication history of a submission (Admin)",
)
async def list_communications(
    submission_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[CommunicationOut]:
    """Returns the submission's communication history (``date`` DESC) incl. tags."""
    rows = await communication_service.list_communications(db, submission_id)
    return [CommunicationOut.model_validate(row) for row in rows]


@router.post(
    "/{submission_id}/communications",
    response_model=CommunicationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a communication entry for a submission (Admin)",
)
async def create_communication(
    submission_id: int,
    body: CommunicationCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CommunicationOut:
    """Creates a communication entry for ``submission_id`` incl. ``tag_ids``."""
    comm = await communication_service.create_communication(
        db,
        submission_id=submission_id,
        data=body,
    )
    await db.commit()
    return CommunicationOut.model_validate(comm)


@router.put(
    "/communications/{comm_id}",
    response_model=CommunicationOut,
    summary="Update a communication entry (Admin)",
)
async def update_communication(
    comm_id: int,
    body: CommunicationUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CommunicationOut:
    """Partially updates a communication entry incl. follow-up fields and tags."""
    comm = await communication_service.update_communication(db, comm_id, body)
    await db.commit()
    return CommunicationOut.model_validate(comm)


@router.delete(
    "/communications/{comm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a communication entry (Admin)",
)
async def delete_communication(
    comm_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> Response:
    """Deletes a communication entry. Raises 404 if not found."""
    await communication_service.delete_communication(db, comm_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

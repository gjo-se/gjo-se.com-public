"""Business logic for application communications (gjo_se_com).

Encapsulates the CRUD operations of the application communication history
(notes, calls, manually captured replies), the tag write logic via the
polymorphic ``core_taggable`` junction and the follow-up fields
(``follow_up_date`` / ``follow_up_done``).

The service orchestrates over ``CommunicationOut`` DTOs; every SQLAlchemy/ORM
concern lives in ``communication_repository`` (Achse 2: ``services`` >
``repositories``). Tags are written through :func:`taggable_service.set_tags`
with ``taggable_type='application_communication'``.
"""

from __future__ import annotations

import structlog
from fastapi import HTTPException, status

from app.application.repositories import (
    communication_repository,
    submission_repository,
)
from app.application.schemas.communication_schemas import (
    CommunicationCreate,
    CommunicationOut,
    CommunicationUpdate,
)
from app.shared.db_access.session_types import AsyncSession
from app.shared.tagging.domain.tagging_rules import TaggableType
from app.shared.tagging.services import taggable_service

logger = structlog.get_logger(__name__)

TAGGABLE_TYPE = TaggableType.APPLICATION_COMMUNICATION.value


async def get_communication(db: AsyncSession, comm_id: int) -> CommunicationOut:
    """Returns a communication by id or raises 404.

    Args:
        db: Active gjo_se_com DB session.
        comm_id: The application_communication id.

    Returns:
        The communication DTO with eager-loaded tags.

    Raises:
        HTTPException 404: No communication with the given id exists.
    """
    comm = await communication_repository.get_by_id(db, comm_id)
    if comm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kommunikation nicht gefunden",
        )
    return comm


async def list_communications(db: AsyncSession, submission_id: int) -> list[CommunicationOut]:
    """Returns the communication history of a submission, ``date`` DESC.

    Tags are eager-loaded by the repository so callers can serialize them
    without N+1 queries.
    """
    return await communication_repository.list_by_submission(db, submission_id)


async def create_communication(
    db: AsyncSession,
    *,
    submission_id: int,
    data: CommunicationCreate,
) -> CommunicationOut:
    """Creates a communication for a submission and writes its tags.

    Raises:
        HTTPException 404: The submission does not exist.
        HTTPException 400: One or more tag ids are invalid or out of scope.
    """
    if await submission_repository.get_by_id(db, submission_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )

    created = await communication_repository.create_from(db, submission_id=submission_id, data=data)

    if data.tag_ids:
        await taggable_service.set_tags(db, TAGGABLE_TYPE, created.id, data.tag_ids)

    logger.info(
        "application_communication: created (comm_id=%s, submission_id=%s, tag_ids=%s)",
        created.id,
        submission_id,
        data.tag_ids,
    )

    persisted = await communication_repository.get_by_id(db, created.id)
    if persisted is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kommunikation nach dem Anlegen nicht gefunden",
        )
    return persisted


async def update_communication(
    db: AsyncSession,
    comm_id: int,
    data: CommunicationUpdate,
) -> CommunicationOut:
    """Partially updates a communication and replaces its tags when given.

    Only fields explicitly set in ``data`` are applied
    (``exclude_unset=True``). Tags are replaced only when ``tag_ids`` is part of
    the request.

    Raises:
        HTTPException 404: The communication does not exist.
        HTTPException 400: One or more tag ids are invalid or out of scope.
    """
    await get_communication(db, comm_id)

    fields = data.model_dump(exclude_unset=True, exclude={"tag_ids"})
    updated = await communication_repository.update_fields(db, comm_id, fields)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kommunikation nach dem Update nicht gefunden",
        )

    if "tag_ids" in data.model_fields_set and data.tag_ids is not None:
        await taggable_service.set_tags(db, TAGGABLE_TYPE, comm_id, data.tag_ids)

    logger.info(
        "application_communication: updated (comm_id=%s, fields=%s)",
        comm_id,
        sorted(fields.keys()),
    )

    persisted = await communication_repository.get_by_id(db, comm_id)
    if persisted is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kommunikation nach dem Update nicht gefunden",
        )
    return persisted


async def delete_communication(db: AsyncSession, comm_id: int) -> None:
    """Deletes a communication including its tag assignments.

    The polymorphic ``core_taggable`` junction has no DB-level cascade for
    ``taggable_id``, so the assignments are cleared explicitly via
    :func:`taggable_service.set_tags` before the entry is removed.

    Raises:
        HTTPException 404: The communication does not exist.
    """
    comm = await get_communication(db, comm_id)
    await taggable_service.set_tags(db, TAGGABLE_TYPE, comm.id, [])
    await communication_repository.delete_by_id(db, comm_id)
    logger.info("application_communication: deleted (comm_id=%s)", comm_id)

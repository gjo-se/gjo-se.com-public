"""Database access for application communications (gjo_se_com).

Reads and writes return ``CommunicationOut`` DTOs (never ORM models) so the
service layer stays free of ``app.<ctx>.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from collections.abc import Mapping
from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.models.communication import (
    Communication,
    CommunicationDirection,
    CommunicationType,
)
from app.application.schemas.communication_schemas import CommunicationCreate, CommunicationOut
from app.shared.tagging.schemas.tag_schemas import TagOut


def _to_out(comm: Communication) -> CommunicationOut:
    """Maps a communication ORM row (with loaded tags) to its DTO."""
    return CommunicationOut(
        id=comm.id,
        application_submission_id=comm.application_submission_id,
        type=comm.type,
        direction=comm.direction,
        subject=comm.subject,
        date=comm.date,
        summary=comm.summary,
        outcome=comm.outcome,
        next_steps=comm.next_steps,
        follow_up_date=comm.follow_up_date,
        follow_up_done=comm.follow_up_done,
        sentiment=comm.sentiment,
        created_at=comm.created_at,
        updated_at=comm.updated_at,
        tags=[TagOut.model_validate(tag) for tag in comm.tags],
    )


async def get_by_id(db: AsyncSession, comm_id: int) -> CommunicationOut | None:
    """Returns a single communication by id as DTO or None (tags eager-loaded)."""
    result = await db.execute(
        select(Communication).options(selectinload(Communication.tags)).where(Communication.id == comm_id)
    )
    comm = result.scalar_one_or_none()
    return _to_out(comm) if comm is not None else None


async def list_by_submission(db: AsyncSession, submission_id: int) -> list[CommunicationOut]:
    """Returns the communication history of a submission, ``date`` DESC, as DTOs."""
    result = await db.execute(
        select(Communication)
        .options(selectinload(Communication.tags))
        .where(Communication.application_submission_id == submission_id)
        .order_by(desc(Communication.date))
    )
    return [_to_out(comm) for comm in result.scalars().all()]


async def _persist(db: AsyncSession, comm: Communication) -> CommunicationOut:
    """Persists a new communication and returns its DTO (tags reloaded)."""
    db.add(comm)
    await db.flush()
    created = await get_by_id(db, comm.id)
    if created is None:
        raise RuntimeError("communication vanished after create")
    return created


async def create_from(db: AsyncSession, *, submission_id: int, data: CommunicationCreate) -> CommunicationOut:
    """Builds and persists a new communication from the create payload."""
    comm = Communication(
        application_submission_id=submission_id,
        type=data.type,
        direction=data.direction,
        subject=data.subject,
        summary=data.summary,
        outcome=data.outcome,
        next_steps=data.next_steps,
        follow_up_date=data.follow_up_date,
        follow_up_done=data.follow_up_done,
        sentiment=data.sentiment,
    )
    return await _persist(db, comm)


async def create_outbound(
    db: AsyncSession,
    submission_id: int,
    subject: str,
    summary: str,
    *,
    date: datetime,
) -> CommunicationOut:
    """Builds and persists an outbound e-mail communication (send service)."""
    comm = Communication(
        application_submission_id=submission_id,
        type=CommunicationType.EMAIL,
        direction=CommunicationDirection.OUTBOUND,
        subject=subject,
        summary=summary,
        date=date,
    )
    return await _persist(db, comm)


async def update_fields(db: AsyncSession, comm_id: int, fields: Mapping[str, object]) -> CommunicationOut | None:
    """Applies scalar field changes to a communication and returns its DTO."""
    result = await db.execute(select(Communication).where(Communication.id == comm_id))
    comm = result.scalar_one_or_none()
    if comm is None:
        return None
    for key, value in fields.items():
        setattr(comm, key, value)
    comm.updated_at = datetime.now(UTC)
    await db.flush()
    return await get_by_id(db, comm_id)


async def delete_by_id(db: AsyncSession, comm_id: int) -> None:
    """Deletes a communication by id."""
    result = await db.execute(select(Communication).where(Communication.id == comm_id))
    comm = result.scalar_one_or_none()
    if comm is not None:
        await db.delete(comm)
        await db.flush()

"""Database access for the core status of CRM statusable entities (gjo_se_com).

Reads the shared ``core_status``/``core_statusable`` rows for a CRM person or
company so the contact-block service stays free of ORM/query imports
(Achse-2: ``services`` > ``repositories``).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.status.models.status import Status, Statusable


async def get_status_name(db: AsyncSession, statusable_type: str, statusable_id: int) -> str | None:
    """Return the core status name for a statusable entity, or ``None`` if unset.

    Args:
        db: Database session.
        statusable_type: Discriminator (e.g. ``crm_person``, ``crm_company``).
        statusable_id: Primary key of the statusable entity.

    Returns:
        The status name (e.g. ``rejected``) or ``None`` when no status is set.
    """
    stmt = (
        select(Status.name)
        .join(Statusable, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == statusable_type,
            Statusable.statusable_id == statusable_id,
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

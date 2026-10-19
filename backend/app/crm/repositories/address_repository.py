"""Database access for CRM address entries (gjo_se_com).

Read/write operations return ``AddressOut`` DTOs (never ORM models) so the
service layer stays free of ``app.crm.models`` imports (Achse-2: ``services`` >
``repositories``).
"""

from functools import partial
from typing import Any

from sqlalchemy import asc, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address

# Re-export: the delete-with-relink owner lives in ``address_delete_repository``
# (its own aggregate-clean module); exposed here so callers keep a single
# repository collaborator.
from app.crm.repositories.address_delete_repository import delete_with_relink
from app.crm.schemas.address_schemas import AddressCreate, AddressOut
from app.shared.db_access import repository_helpers

__all__ = [
    "create",
    "delete",
    "delete_with_relink",
    "demote_primary_for_company",
    "get_by_id",
    "get_primary_for_company",
    "list_by_company",
    "update",
]

_SORTABLE_COLUMNS: dict[str, Any] = {
    "id": Address.id,
    "label": Address.label,
    "city": Address.city,
    "country": Address.country,
    "is_primary": Address.is_primary,
    "created_at": Address.created_at,
    "updated_at": Address.updated_at,
}
_DEFAULT_SORT = "created_at"


_to_out = partial(repository_helpers.to_out, dto_cls=AddressOut)


get_by_id = partial(repository_helpers.get_by_id, model=Address, dto_cls=AddressOut)


async def get_primary_for_company(
    db: AsyncSession,
    company_id: int,
) -> AddressOut | None:
    """Return the current primary address for a company as DTO.

    Args:
        db: Database session.
        company_id: UUID of the company.

    Returns:
        The primary address DTO or ``None`` if no primary is set.
    """
    result = await db.execute(
        select(Address).where(
            Address.crm_company_id == company_id,
            Address.is_primary.is_(True),
        )
    )
    address = result.scalar_one_or_none()
    return _to_out(address) if address is not None else None


async def list_by_company(
    db: AsyncSession,
    company_id: int,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "asc",
) -> list[AddressOut]:
    """Return all addresses for a given company as DTOs.

    Args:
        db: Database session.
        company_id: UUID of the parent company.
        sort_by: Column to sort by (default ``created_at``).
        sort_order: ``asc`` or ``desc``.

    Returns:
        List of matching address DTOs.
    """
    column = _SORTABLE_COLUMNS.get(sort_by, Address.created_at)
    order_expr = desc(column) if sort_order == "desc" else asc(column)
    stmt = select(Address).where(Address.crm_company_id == company_id).order_by(order_expr)
    result = await db.execute(stmt)
    return [_to_out(address) for address in result.scalars().all()]


async def create(db: AsyncSession, data: AddressCreate) -> AddressOut:
    """Builds and persists a new address, returning its DTO.

    Args:
        db: Database session.
        data: Validated creation payload.

    Returns:
        Persisted address as DTO with generated primary key and timestamps.
    """
    address = Address(**data.model_dump())
    db.add(address)
    await db.flush()
    await db.refresh(address)
    return _to_out(address)


update = partial(repository_helpers.update, model=Address, dto_cls=AddressOut)


delete = partial(repository_helpers.delete, model=Address)


async def demote_primary_for_company(db: AsyncSession, company_id: int) -> None:
    """Sets the company's existing primary address to ``is_primary=False``.

    Used before creating or promoting a new primary address.

    Args:
        db: Database session.
        company_id: UUID of the company whose primary address is demoted.
    """
    primary = await db.scalar(
        select(Address).where(
            Address.crm_company_id == company_id,
            Address.is_primary.is_(True),
        )
    )
    if primary is not None:
        primary.is_primary = False
        await db.flush()

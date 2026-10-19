"""Company-joined person reads plus the sort data-tables (gjo_se_com).

Owns the person reads that LEFT JOIN the canonical company (via
``person → address → company``) – the detail-with-company read, the paginated
list and the search count – together with the sortable-column maps they need
and the correlated ``EXISTS`` delete guard. Split out of ``person_repository``
(God-File-Refactor); the plain lookups and the mapper live in
``person_read_repository``.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Exists, asc, desc, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crm.models.address import Address
from app.crm.models.person import Person
from app.crm.models.project_person import ProjectPerson
from app.crm.repositories import company_repository
from app.crm.repositories.person_read_repository import _to_out
from app.crm.schemas.person_schemas import PersonOut
from app.shared.status.models.status import Status, Statusable

# Columns directly on Person
_PERSON_SORTABLE: dict[str, Any] = {
    "id": Person.id,
    "first_name": Person.first_name,
    "last_name": Person.last_name,
    "email": Person.email,
    "phone": Person.phone,
    "role": Person.role,
    "department": Person.department,
    "created_at": Person.created_at,
    "updated_at": Person.updated_at,
}

# Sort-by keys that require company JOIN – resolved inside list_paginated()
_COMPANY_SORT_KEYS: frozenset[str] = frozenset({"company_name", "company_city"})

_DEFAULT_SORT = "last_name"


def _has_project_links() -> Exists:
    """Correlated EXISTS: person is linked to at least one project.

    Used as the delete guard – a person tied to projects must not be deleted
    (it would silently drop the project↔person links).
    """
    return exists().where(ProjectPerson.crm_person_id == Person.id).correlate(Person)


async def get_by_id_with_company(db: AsyncSession, person_id: int) -> PersonOut | None:
    """Return a single person with primary company info as DTO.

    Does the same LEFT JOIN as list_paginated() so that the DTO
    includes ``primary_company_id``, ``primary_company_name``,
    ``primary_company_city``, ``primary_company_email`` and
    ``has_dependents``.

    Args:
        db: Database session.
        person_id: Primary key of the person.

    Returns:
        Person DTO or ``None``.
    """
    # ── Company via canonical path: person → address → company ──
    company_proj = company_repository.company_with_primary_address_subquery()
    company_with_city_subq = (
        select(
            Person.id.label("crm_person_id"),
            company_proj.c.company_id.label("primary_company_id"),
            company_proj.c.company_name.label("primary_company_name"),
            company_proj.c.company_city.label("primary_company_city"),
            company_proj.c.company_email.label("primary_company_email"),
        )
        .select_from(Person)
        .join(Address, Person.address_id == Address.id)
        .join(company_proj, company_proj.c.company_id == Address.crm_company_id)
        .where(Person.id == person_id)
        .subquery()
    )

    stmt = (
        select(
            Person,
            company_with_city_subq.c.primary_company_id,
            company_with_city_subq.c.primary_company_name,
            company_with_city_subq.c.primary_company_city,
            company_with_city_subq.c.primary_company_email,
            _has_project_links().label("has_dependents"),
        )
        .options(selectinload(Person.address))
        .outerjoin(
            company_with_city_subq,
            Person.id == company_with_city_subq.c.crm_person_id,
        )
        .where(Person.id == person_id)
    )

    result = await db.execute(stmt)
    row = result.one_or_none()
    if row is None:
        return None
    out = _to_out(row[0])
    out.primary_company_id = row[1]
    out.primary_company_name = row[2]
    out.primary_company_city = row[3]
    out.primary_company_email = row[4]
    out.has_dependents = bool(row[5])
    return out


async def list_paginated(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "asc",
) -> list[PersonOut]:
    """Return paginated persons with optional search, linked company info, and core status.

    LEFT JOINs the company via canonical path (person → address → company)
    and its primary address so that company_name/company_city sorting and
    display is available without N+1 queries. LEFT JOINs core_statusable for status.

    Args:
        db: Database session.
        q: Search term matching ``first_name``, ``last_name``, or ``email``
           via ILIKE (optional).
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Column to sort by (default ``last_name``). Supports person
            columns and ``company_name``/``company_city`` from the first
            linked company.
        sort_order: ``asc`` or ``desc``.

    Returns:
        List of person DTOs carrying company and status columns.
    """
    # ── Subquery: company via canonical path (person → address → company) ──
    company_proj = company_repository.company_with_primary_address_subquery()
    company_with_city_subq = (
        select(
            Person.id.label("crm_person_id"),
            company_proj.c.company_id.label("primary_company_id"),
            company_proj.c.company_name.label("primary_company_name"),
            company_proj.c.company_city.label("primary_company_city"),
        )
        .select_from(Person)
        .join(Address, Person.address_id == Address.id)
        .join(company_proj, company_proj.c.company_id == Address.crm_company_id)
        .subquery()
    )

    # ── Sort column resolution ───────────────────────────────────────
    if sort_by in _COMPANY_SORT_KEYS:
        company_alias_map: dict[str, Any] = {
            "company_name": company_with_city_subq.c.primary_company_name,
            "company_city": company_with_city_subq.c.primary_company_city,
        }
        sort_col = company_alias_map.get(sort_by, Person.last_name)
    else:
        sort_col = _PERSON_SORTABLE.get(sort_by, Person.last_name)
    order_expr = desc(sort_col) if sort_order == "desc" else asc(sort_col)

    # ── Main query ───────────────────────────────────────────────────
    stmt = (
        select(
            Person,
            company_with_city_subq.c.primary_company_id,
            company_with_city_subq.c.primary_company_name,
            company_with_city_subq.c.primary_company_city,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
            _has_project_links().label("has_dependents"),
        )
        .options(selectinload(Person.address))
        .outerjoin(
            company_with_city_subq,
            Person.id == company_with_city_subq.c.crm_person_id,
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "crm_person") & (Statusable.statusable_id == Person.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .order_by(order_expr)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Person.first_name.ilike(pattern),
                Person.last_name.ilike(pattern),
                Person.email.ilike(pattern),
                company_with_city_subq.c.primary_company_name.ilike(pattern),
            )
        )

    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()
    outputs: list[PersonOut] = []
    for row in rows:
        out = _to_out(row[0])
        out.primary_company_id = row[1]
        out.primary_company_name = row[2]
        out.primary_company_city = row[3]
        out.status = row[4]
        out.status_color_token = row[5]
        out.has_dependents = bool(row[6])
        outputs.append(out)
    return outputs


async def count(db: AsyncSession, q: str | None = None) -> int:
    """Return total count of persons, optionally filtered by search.

    Args:
        db: Database session.
        q: Search term matching ``first_name``, ``last_name``, ``email``, or the
            linked company ``name`` via ILIKE (optional).

    Returns:
        Total number of matching persons.
    """
    stmt = select(func.count()).select_from(Person)
    if q:
        pattern = f"%{q}%"
        company_proj = company_repository.company_with_primary_address_subquery()
        company_match = (
            exists()
            .where(
                Address.id == Person.address_id,
                company_proj.c.company_id == Address.crm_company_id,
                company_proj.c.company_name.ilike(pattern),
            )
            .correlate(Person)
        )
        stmt = stmt.where(
            or_(
                Person.first_name.ilike(pattern),
                Person.last_name.ilike(pattern),
                Person.email.ilike(pattern),
                company_match,
            )
        )
    result = await db.execute(stmt)
    return result.scalar_one()

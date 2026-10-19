"""Database access for CRM company entries (gjo_se_com).

Read/write operations return ``CompanyOut`` DTOs (never ORM models) so the
service layer stays free of ``app.crm.models`` imports (Achse-2: ``services`` >
``repositories``). Owns the single-record reads, the paginated list/count with
sortable columns and the write helpers. Name-normalised and domain lookups live
in ``company_name_repository`` and ``company_domain_repository``.
"""

from typing import Any
from urllib.parse import quote_plus

from sqlalchemy import asc, desc, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.infrastructure.hunter_client import CompanyEnrichmentData
from app.crm.models.address import Address
from app.crm.models.company import Company
from app.crm.schemas.company_schemas import CompanyCreate, CompanyOut, CompanyUpdate
from app.shared.status.models.status import Status, Statusable

_LINKEDIN_COMPANY_SEARCH_URL = "https://linkedin.com/search/results/companies/?keywords={query}"
_XING_COMPANY_SEARCH_URL = "https://www.xing.com/search/members?keywords={query}"
_KUNUNU_SEARCH_URL = "https://www.kununu.com/de/search?q={query}"

# Columns directly on Company
_COMPANY_SORTABLE: dict[str, Any] = {
    "id": Company.id,
    "name": Company.name,
    "industry": Company.industry,
    "company_size": Company.company_size,
    "founded_year": Company.founded_year,
    "kununu_score": Company.kununu_score,
    "created_at": Company.created_at,
    "updated_at": Company.updated_at,
}

# Sort-by keys that require the primary-address subquery.
# Resolved to actual columns inside list_paginated() where the subquery exists.
_ADDRESS_SORT_KEYS: frozenset[str] = frozenset({"city", "country"})

_ALL_SORT_KEYS: frozenset[str] = frozenset({*_COMPANY_SORTABLE.keys(), *_ADDRESS_SORT_KEYS})
_DEFAULT_SORT = "name"


def _to_out(company: Company) -> CompanyOut:
    """Maps a company ORM row to its DTO.

    Args:
        company: The persisted ``Company`` row (with eagerly loaded tags).

    Returns:
        The read DTO handed to the service layer.
    """
    return CompanyOut.model_validate(company)


def company_with_primary_address_subquery() -> Any:
    """Owner-side read projection: one row per company with its primary address.

    Projects ``company_id``/``company_name``/``company_email`` plus the primary
    address ``company_city``. Consumers (e.g. the Person list, which shows the
    linked company via ``person → address → company``) embed this projection
    instead of importing the foreign Company model.

    Returns:
        Subquery with the company id/name/email and primary city columns.
    """
    primary_addr_subq = (
        select(
            Address.crm_company_id,
            Address.city.label("primary_city"),
        )
        .where(Address.is_primary.is_(True))
        .subquery()
    )
    return (
        select(
            Company.id.label("company_id"),
            Company.name.label("company_name"),
            Company.email.label("company_email"),
            primary_addr_subq.c.primary_city.label("company_city"),
        )
        .outerjoin(primary_addr_subq, Company.id == primary_addr_subq.c.crm_company_id)
        .subquery()
    )


async def get_by_id(db: AsyncSession, company_id: int) -> CompanyOut | None:
    """Return a single company by primary key as DTO.

    Args:
        db: Database session.
        company_id: UUID of the company to fetch.

    Returns:
        Company DTO or ``None`` if not found.
    """
    # An explicit ``select`` (not ``db.get``) guarantees the eager ``selectin``
    # load of ``Company.tags`` runs, so the DTO mapping never triggers a lazy
    # load outside the async context.
    company = await db.scalar(select(Company).where(Company.id == company_id))
    return _to_out(company) if company is not None else None


async def get_by_name(db: AsyncSession, name: str) -> CompanyOut | None:
    """Return a company by exact name match as DTO.

    Args:
        db: Database session.
        name: Exact company name to search for.

    Returns:
        Company DTO or ``None`` if not found.
    """
    result = await db.execute(select(Company).where(Company.name == name))
    company = result.scalar_one_or_none()
    return _to_out(company) if company is not None else None


async def get_by_name_ci(db: AsyncSession, name: str) -> CompanyOut | None:
    """Return a company by case-insensitive name match as DTO.

    Uses the functional unique index ``uq_crm_company_name_lower``
    on ``lower(name)`` for efficient lookup.

    Args:
        db: Database session.
        name: Company name (any case).

    Returns:
        Company DTO or ``None`` if not found.
    """
    result = await db.execute(select(Company).where(func.lower(Company.name) == func.lower(name)))
    company = result.scalar_one_or_none()
    return _to_out(company) if company is not None else None


async def list_paginated(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = "asc",
) -> list[CompanyOut]:
    """Return paginated companies with optional name search, primary address, and core status.

    LEFT JOINs the primary address so that city/country sorting and display
    is available without N+1 queries. LEFT JOINs core_statusable for status.

    Args:
        db: Database session.
        q: Search term matching ``name`` via ILIKE (optional).
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Column to sort by (default ``name``). Supports company columns
            and ``city``/``country`` from the primary address.
        sort_order: ``asc`` or ``desc``.

    Returns:
        List of company DTOs carrying the primary-address and status columns.
    """
    # Person links are owned by the Person aggregate; its owner exposes the
    # company-id projection used for the ``has_dependents`` guard.
    from app.crm.repositories import person_repository

    # Subquery: one row per company for the primary address
    primary_addr_subq = (
        select(
            Address.crm_company_id,
            Address.city.label("primary_city"),
            Address.country.label("primary_country"),
        )
        .where(Address.is_primary.is_(True))
        .subquery()
    )

    # Resolve sort column: company-owned columns from _COMPANY_SORTABLE,
    # address-owned columns from the subquery aliases.
    if sort_by in _ADDRESS_SORT_KEYS:
        addr_alias_map: dict[str, Any] = {
            "city": primary_addr_subq.c.primary_city,
            "country": primary_addr_subq.c.primary_country,
        }
        sort_col = addr_alias_map.get(sort_by, Company.name)
    else:
        sort_col = _COMPANY_SORTABLE.get(sort_by, Company.name)
    order_expr = desc(sort_col) if sort_order == "desc" else asc(sort_col)

    # ── has_dependents: addresses or persons (person link via the Person owner) ──
    has_addresses = exists().where(Address.crm_company_id == Company.id).correlate(Company)
    has_persons = Company.id.in_(person_repository.company_ids_with_persons_select())
    has_dependents_label = or_(has_addresses, has_persons).label("has_dependents")

    stmt = (
        select(
            Company,
            primary_addr_subq.c.primary_city,
            primary_addr_subq.c.primary_country,
            has_dependents_label,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            primary_addr_subq,
            Company.id == primary_addr_subq.c.crm_company_id,
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "crm_company") & (Statusable.statusable_id == Company.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .order_by(order_expr)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Company.name.ilike(pattern),
                primary_addr_subq.c.primary_city.ilike(pattern),
            )
        )

    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()
    outputs: list[CompanyOut] = []
    for row in rows:
        out = _to_out(row[0])
        out.primary_city = row[1]
        out.primary_country = row[2]
        out.has_dependents = bool(row[3])
        out.status = row[4]
        out.status_color_token = row[5]
        outputs.append(out)
    return outputs


async def count(db: AsyncSession, q: str | None = None) -> int:
    """Return total count of companies, optionally filtered by name/city search.

    Args:
        db: Database session.
        q: Search term matching ``name`` or the primary address ``city`` via
            ILIKE (optional).

    Returns:
        Total number of matching companies.
    """
    stmt = select(func.count()).select_from(Company)
    if q:
        pattern = f"%{q}%"
        primary_addr_subq = (
            select(
                Address.crm_company_id,
                Address.city.label("primary_city"),
            )
            .where(Address.is_primary.is_(True))
            .subquery()
        )
        stmt = stmt.outerjoin(
            primary_addr_subq,
            Company.id == primary_addr_subq.c.crm_company_id,
        ).where(
            or_(
                Company.name.ilike(pattern),
                primary_addr_subq.c.primary_city.ilike(pattern),
            )
        )
    result = await db.execute(stmt)
    return result.scalar_one()


async def create(db: AsyncSession, data: CompanyCreate) -> CompanyOut:
    """Builds and persists a new company, returning its DTO.

    Args:
        db: Database session.
        data: Validated creation payload.

    Returns:
        Persisted company as DTO.
    """
    company = Company(**data.model_dump())
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return _to_out(company)


async def update(db: AsyncSession, company_id: int, data: CompanyUpdate) -> CompanyOut | None:
    """Applies a PATCH-style update to a company and returns its DTO.

    Args:
        db: Database session.
        company_id: UUID of the company to update.
        data: Partial update payload (only set fields are applied).

    Returns:
        Updated company as DTO, or ``None`` when it does not exist.
    """
    company = await db.get(Company, company_id)
    if company is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    await db.flush()
    await db.refresh(company)
    return _to_out(company)


async def delete(db: AsyncSession, company_id: int) -> bool:
    """Removes a company by id.

    Args:
        db: Database session.
        company_id: UUID of the company to delete.

    Returns:
        True when the row was deleted; False when no row with the id exists.
    """
    company = await db.get(Company, company_id)
    if company is None:
        return False
    await db.delete(company)
    await db.flush()
    return True


async def _ensure_single_primary_address(db: AsyncSession, company_id: int) -> None:
    """Promote the oldest address to primary if the company has none.

    Only a promotion is required here: callers demote every moved address
    before invoking this, so a merged company can never end up with a second
    ``is_primary`` row.

    Args:
        db: Database session.
        company_id: Company whose primary address is ensured.
    """
    has_primary = await db.scalar(
        select(Address.id)
        .where(
            Address.crm_company_id == company_id,
            Address.is_primary.is_(True),
        )
        .limit(1)
    )
    if has_primary is not None:
        return

    oldest_address = await db.scalar(
        select(Address)
        .where(Address.crm_company_id == company_id)
        .order_by(Address.created_at.asc(), Address.id.asc())
        .limit(1)
    )
    if oldest_address is None:
        return

    oldest_address.is_primary = True
    await db.flush()


async def merge(db: AsyncSession, source_id: int, target_id: int) -> CompanyOut:
    """Merge source company into target – reassign addresses, then delete source.

    Reassigns ``crm_address.crm_company_id`` → target (moved addresses are
    demoted to ``is_primary=False``; the target keeps exactly one primary
    address). Persons linked via the canonical path are automatically
    reassigned with their addresses.

    Args:
        db: Database session.
        source_id: Company to be merged (will be deleted).
        target_id: Company to keep.

    Returns:
        Target company as DTO.

    Raises:
        RuntimeError: The target vanished after the merge.
    """
    source = await db.get(Company, source_id)
    target = await db.get(Company, target_id)
    if source is None or target is None:
        raise RuntimeError("merge called with a missing company")

    # ── 1. Reassign addresses (never carry is_primary over) ────────────────
    source_addresses = await db.scalars(select(Address).where(Address.crm_company_id == source_id))
    for address in source_addresses:
        address.crm_company_id = target_id
        address.is_primary = False
    await db.flush()

    # ── 2. Ensure the target keeps exactly one primary address ─────────────
    await _ensure_single_primary_address(db, target_id)

    # ── 3. Persons are automatically reassigned with their addresses ───────
    # ── 4. Delete source company ──────────────────────────────────────────
    await db.delete(source)
    await db.flush()

    merged = await get_by_id(db, target_id)
    if merged is None:
        raise RuntimeError("company vanished after merge")
    return merged


async def apply_enrichment(
    db: AsyncSession,
    company_id: int,
    enrichment: CompanyEnrichmentData,
) -> CompanyOut | None:
    """Apply Hunter enrichment fields to a company (fill-only, never overwrite).

    Args:
        db: Database session.
        company_id: Company to enrich.
        enrichment: Hunter company-enrichment payload.

    Returns:
        Updated company as DTO, or ``None`` when it does not exist.
    """
    company = await db.get(Company, company_id)
    if company is None:
        return None
    _apply_enrichment(company, enrichment)
    await db.flush()
    await db.refresh(company)
    return _to_out(company)


def _apply_enrichment(company: Company, enrichment: CompanyEnrichmentData) -> None:
    """Apply enrichment data to a company instance (fill-only, in place).

    Args:
        company: The company ORM row to mutate.
        enrichment: Hunter company-enrichment payload.
    """
    if enrichment.website and not company.website:
        company.website = enrichment.website
    if enrichment.industry and not company.industry:
        company.industry = enrichment.industry
    if enrichment.company_size and not company.company_size:
        company.company_size = enrichment.company_size
    if enrichment.founded_year is not None and company.founded_year is None:
        company.founded_year = enrichment.founded_year
    if enrichment.linkedin_url and not company.linkedin_url:
        company.linkedin_url = enrichment.linkedin_url


def _apply_company_search_url_defaults(company: Company) -> None:
    """Set LinkedIn, Xing and Kununu search-URL placeholders when no real URL exists.

    Only sets a field when it is currently NULL. Uses ``urllib.parse.quote_plus``
    to encode the company name.

    Args:
        company: The company ORM row to mutate.
    """
    name = (company.name or "").strip()
    if not name:
        return

    query = quote_plus(name)

    if not company.linkedin_url:
        company.linkedin_url = _LINKEDIN_COMPANY_SEARCH_URL.format(query=query)

    if not company.xing_url:
        company.xing_url = _XING_COMPANY_SEARCH_URL.format(query=query)

    if not company.kununu_url:
        company.kununu_url = _KUNUNU_SEARCH_URL.format(query=query)


async def apply_search_url_defaults(db: AsyncSession, company_id: int) -> CompanyOut | None:
    """Set LinkedIn/Xing/Kununu search-URL placeholders when no real URL exists.

    Only sets a field when it is currently NULL.

    Args:
        db: Database session.
        company_id: Company to fill the search-URL defaults for.

    Returns:
        Updated company as DTO, or ``None`` when it does not exist.
    """
    company = await db.get(Company, company_id)
    if company is None:
        return None

    _apply_company_search_url_defaults(company)
    await db.flush()
    await db.refresh(company)
    return _to_out(company)

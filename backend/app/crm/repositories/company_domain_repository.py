"""Database access for CRM company lookup by normalised website domain.

Extracted from ``company_repository``: the domain normalisation and the
case-insensitive website-domain lookup form their own cohesive component.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.company import Company
from app.crm.schemas.company_schemas import CompanyOut


def _normalize_domain(domain: str) -> str:
    """Normalise a domain/URL to its bare lowercase host form.

    Strips scheme, leading ``www.``, path, and query so that
    ``https://www.Etengo.de/karriere`` → ``etengo.de``.
    """
    value = (domain or "").strip().lower()
    if "://" in value:
        value = value.split("://", 1)[1]
    value = value.split("/", 1)[0]
    value = value.split("?", 1)[0]
    if value.startswith("www."):
        value = value[4:]
    return value


async def get_by_domain_ci(db: AsyncSession, domain: str) -> CompanyOut | None:
    """Return a company whose ``website`` contains the given domain.

    The domain is normalised (scheme, ``www.``, path, query removed, lowercased)
    and matched case-insensitively against the stored website.

    Args:
        db: Database session.
        domain: Domain or URL (any form).

    Returns:
        First matching company DTO or ``None``.
    """
    normalized = _normalize_domain(domain)
    if not normalized:
        return None
    result = await db.execute(select(Company).where(func.lower(Company.website).like(f"%{normalized}%")).limit(1))
    company = result.scalar_one_or_none()
    return CompanyOut.model_validate(company) if company is not None else None

"""Database access for CRM company lookup by legal-form-normalised name.

Extracted from ``company_repository``: the name normalisation (legal-form suffix
stripping) and the normalised-name lookup form their own cohesive component.
"""

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.company import Company
from app.crm.schemas.company_schemas import CompanyOut

# Legal-form suffixes stripped when normalising a company name.
# Longest phrases must come first so "gmbh & co. kg" is removed before "gmbh".
_LEGAL_SUFFIXES: tuple[str, ...] = (
    "gmbh & co. kg",
    "gmbh",
    "ag",
    "ug",
    "kg",
    "ohg",
    "gbr",
    "e.v.",
    "ev",
    "mbh",
    "se",
    "inc",
    "ltd",
)


def _normalize_company_name(name: str) -> str:
    """Lowercase, trim, collapse whitespace, and strip legal-form suffixes.

    ``"Etengo GmbH"`` → ``"etengo"``; ``"SAP SE"`` → ``"sap"``. A name that
    consists solely of a legal suffix (e.g. ``"GmbH"``) is returned unchanged.
    """
    normalized = " ".join((name or "").strip().lower().split())
    if not normalized:
        return ""

    changed = True
    while changed:
        changed = False
        for suffix in _LEGAL_SUFFIXES:
            if normalized.endswith(f" {suffix}"):
                normalized = normalized[: -(len(suffix) + 1)].strip()
                changed = True
                break
        normalized = normalized.rstrip(" .,&").strip()

    return re.sub(r"\s+", " ", normalized).strip()


async def get_by_normalized_name(db: AsyncSession, name: str) -> CompanyOut | None:
    """Return a company matching ``name`` after legal-form normalisation.

    Narrowed by an ``ILIKE %<first token>%`` pre-filter, then compared in
    Python using :func:`_normalize_company_name`. First match wins.

    Args:
        db: Database session.
        name: Company name (any case / legal form).

    Returns:
        First matching company DTO or ``None``.
    """
    normalized = _normalize_company_name(name)
    if not normalized:
        return None

    first_token = " ".join((name or "").strip().lower().split()).split(" ", 1)[0]
    if not first_token:
        return None

    result = await db.execute(select(Company).where(Company.name.ilike(f"%{first_token}%")))
    for candidate in result.scalars().all():
        if _normalize_company_name(candidate.name) == normalized:
            return CompanyOut.model_validate(candidate)
    return None

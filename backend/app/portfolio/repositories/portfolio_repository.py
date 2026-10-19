"""Database access for localized portfolio reads (gjo_se_com).

Read-only repository for the public portfolio API. All queries eager-load
translations so the service layer can pick the requested locale without
extra round-trips.

The paginated admin list lives in :mod:`portfolio_admin_repository`; the 1:N
proof sub-resource lives in :mod:`portfolio_proof_repository`.
"""

from collections.abc import Mapping

from sqlalchemy import delete as delete_stmt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import Select

from app.portfolio.domain.portfolio_contract import PortfolioRecord, TranslationRecord
from app.portfolio.models.portfolio import Portfolio
from app.portfolio.models.proof import Proof
from app.portfolio.models.translation import Translation
from app.portfolio.schemas.portfolio_schemas import LocaleFieldsOut


def _base_stmt() -> Select[tuple[Portfolio]]:
    """Base statement eager-loading portfolio translations and proof translations.

    Returns:
        A select over Portfolio with translations, proofs, and each
        proof's translations loaded eagerly. Proofs are already sorted by
        ``sort`` via the relationship ``order_by``.
    """
    return select(Portfolio).options(
        selectinload(Portfolio.translations),
        selectinload(Portfolio.proofs).selectinload(Proof.translations),
    )


async def get_list(db: AsyncSession) -> list[Portfolio]:
    """Returns all portfolios with eager-loaded translations, sorted by ``sort`` ASC.

    Args:
        db: Active async DB session.

    Returns:
        List of Portfolio ordered by ``sort`` ascending.
    """
    stmt = _base_stmt().order_by(Portfolio.sort.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def reorder(db: AsyncSession, ordered_slugs: list[str]) -> list[Portfolio]:
    """Updates ``sort`` for multiple portfolios based on the ordered slug list.

    Args:
        db: Active async DB session.
        ordered_slugs: List of portfolio slugs in desired order (index = sort).

    Returns:
        All portfolios re-sorted by ``sort`` ascending (with translations).
    """
    for new_index, slug in enumerate(ordered_slugs):
        result = await db.execute(select(Portfolio).where(Portfolio.slug == slug))
        portfolio = result.scalar_one_or_none()
        if portfolio:
            portfolio.sort = new_index
    await db.flush()
    return await get_list(db)


async def get_by_slug(db: AsyncSession, slug: str) -> Portfolio | None:
    """Returns a single portfolio by slug with eager-loaded translations.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.

    Returns:
        The matching Portfolio or None if not found.
    """
    stmt = _base_stmt().where(Portfolio.slug == slug)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_proofs(db: AsyncSession, slug: str) -> list[Proof] | None:
    """Returns the proofs of a portfolio by slug, sorted by ``sort`` ASC.

    Resolves the portfolio via ``get_by_slug``; the ``proofs`` relationship is
    already sorted by ``sort`` through its ``order_by`` definition.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.

    Returns:
        The portfolio's proofs (with translations loaded) or None if the
        portfolio does not exist.
    """
    portfolio = await get_by_slug(db, slug)
    if portfolio is None:
        return None
    return list(portfolio.proofs)


async def create(db: AsyncSession, portfolio: Portfolio) -> Portfolio:
    """Persists a new portfolio project and refreshes it from the DB.

    Args:
        db: Active async DB session.
        portfolio: Portfolio (with translations already attached).

    Returns:
        The created portfolio with generated ``id``/timestamps.
    """
    db.add(portfolio)
    await db.flush()
    await db.refresh(portfolio)
    return portfolio


async def update(db: AsyncSession, portfolio: Portfolio) -> Portfolio:
    """Flushes pending changes on an existing portfolio and refreshes it.

    Args:
        db: Active async DB session.
        portfolio: Portfolio with applied changes.

    Returns:
        The updated portfolio.
    """
    await db.flush()
    await db.refresh(portfolio)
    return portfolio


async def delete(db: AsyncSession, portfolio: Portfolio) -> None:
    """Deletes a portfolio project.

    Proofs and translations are removed via the relationship
    ``cascade="all, delete-orphan"``.

    Args:
        db: Active async DB session.
        portfolio: Portfolio to delete.
    """
    await db.delete(portfolio)


async def slug_exists(db: AsyncSession, slug: str, exclude_id: int | None = None) -> bool:
    """Returns whether a portfolio with *slug* exists.

    Args:
        db: Active async DB session.
        slug: Slug to check (already normalized).
        exclude_id: When set, the portfolio with this id is ignored (used for
            slug changes on update).

    Returns:
        True if a conflicting portfolio exists, False otherwise.
    """
    stmt = select(Portfolio.id).where(Portfolio.slug == slug)
    if exclude_id is not None:
        stmt = stmt.where(Portfolio.id != exclude_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def replace_translations(
    db: AsyncSession,
    portfolio: Portfolio,
    translations: Mapping[str, LocaleFieldsOut],
) -> None:
    """Replaces all translation rows of *portfolio* with *translations*.

    Uses the translation-table pattern: existing rows are deleted and the new
    rows created in one flush, avoiding partial merges.

    Args:
        db: Active async DB session.
        portfolio: Portfolio whose translations are replaced.
        translations: Mapping of locale → localized fields to persist.
    """
    # Existing translation rows are removed unconditionally – a DELETE with no
    # matching rows is a no-op. This avoids a sync lazy-load on the relationship
    # (which would raise MissingGreenlet inside the async session after refresh).
    _ = await db.execute(delete_stmt(Translation).where(Translation.portfolio_id == portfolio.id))
    # New rows are persisted via add_all with an explicit portfolio_id instead
    # of assigning ``portfolio.translations``. The collection assignment would
    # trigger a lazy-load on the (possibly unloaded) relationship, which is not
    # allowed inside an async session after a flush/refresh.
    db.add_all(
        Translation(
            portfolio_id=portfolio.id,
            locale=locale,
            **fields.model_dump(),
        )
        for locale, fields in translations.items()
    )
    await db.flush()


def to_record(portfolio: Portfolio) -> PortfolioRecord:
    """Maps a portfolio ORM row (with loaded translations) to its read record.

    Args:
        portfolio: Portfolio with eager-loaded ``translations``.

    Returns:
        The service-boundary record carrying the structure fields and all
        localized translation rows.
    """
    return PortfolioRecord(
        id=portfolio.id,
        slug=portfolio.slug,
        image=portfolio.image,
        link_url=portfolio.link_url,
        link_label=portfolio.link_label,
        year=portfolio.year,
        sort=portfolio.sort,
        translations=tuple(
            TranslationRecord(
                locale=t.locale,
                title=t.title,
                sub_title=t.sub_title,
                teaser=t.teaser,
                impact_summary=t.impact_summary,
            )
            for t in portfolio.translations
        ),
    )


async def list_records(db: AsyncSession) -> list[PortfolioRecord]:
    """Returns all portfolios as records, sorted by ``sort`` ASC.

    Args:
        db: Active async DB session.

    Returns:
        All portfolios (with translations) as service-boundary records.
    """
    portfolios = await get_list(db)
    return [to_record(portfolio) for portfolio in portfolios]


async def get_record_by_slug(db: AsyncSession, slug: str) -> PortfolioRecord | None:
    """Returns a single portfolio as a record by slug, or ``None``.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.

    Returns:
        The matching record (with translations) or ``None`` if not found.
    """
    portfolio = await get_by_slug(db, slug)
    return to_record(portfolio) if portfolio is not None else None


async def get_record_by_id(db: AsyncSession, portfolio_id: int) -> PortfolioRecord | None:
    """Returns a single portfolio as a record by id, or ``None``.

    Args:
        db: Active async DB session.
        portfolio_id: Primary key of the portfolio.

    Returns:
        The matching record (with translations) or ``None`` if not found.
    """
    stmt = _base_stmt().where(Portfolio.id == portfolio_id)
    result = await db.execute(stmt)
    portfolio = result.scalar_one_or_none()
    return to_record(portfolio) if portfolio is not None else None


async def create_record(
    db: AsyncSession,
    *,
    slug: str,
    image: str | None,
    link_url: str | None,
    link_label: str | None,
    year: str | None,
    sort: int,
    translations: Mapping[str, LocaleFieldsOut],
) -> PortfolioRecord:
    """Creates a portfolio with its translations and returns its record.

    Args:
        db: Active async DB session.
        slug: Normalized, unique slug.
        image: Hero/teaser image storage key.
        link_url: Optional external link URL.
        link_label: Optional external link label.
        year: Optional year label.
        sort: Ordering index.
        translations: Locale → localized fields to persist.

    Returns:
        The created portfolio as a service-boundary record.
    """
    portfolio = Portfolio(
        slug=slug,
        image=image,
        link_url=link_url,
        link_label=link_label,
        year=year,
        sort=sort,
    )
    db.add(portfolio)
    await db.flush()
    await replace_translations(db, portfolio, translations)
    await db.flush()
    await db.refresh(portfolio, ["translations"])
    return to_record(portfolio)


async def update_record(
    db: AsyncSession,
    portfolio_id: int,
    *,
    updates: Mapping[str, object],
    translations: Mapping[str, LocaleFieldsOut] | None,
) -> PortfolioRecord | None:
    """Applies partial field updates and optional translation replacement.

    Args:
        db: Active async DB session.
        portfolio_id: Primary key of the portfolio to update.
        updates: Structure-field values to set on the portfolio.
        translations: Locale → localized fields to replace the translation set
            with, or ``None`` to keep the existing translations.

    Returns:
        The updated portfolio as a record, or ``None`` if it does not exist.
    """
    portfolio = await db.get(Portfolio, portfolio_id)
    if portfolio is None:
        return None
    for key, value in updates.items():
        setattr(portfolio, key, value)
    if translations is not None:
        await replace_translations(db, portfolio, translations)
    await db.flush()
    await db.refresh(portfolio, ["translations"])
    return to_record(portfolio)


async def delete_by_slug(db: AsyncSession, slug: str) -> bool:
    """Deletes the portfolio with *slug*.

    Args:
        db: Active async DB session.
        slug: Slug of the portfolio to delete.

    Returns:
        ``True`` when a portfolio was deleted, ``False`` when none matched.
    """
    portfolio = await get_by_slug(db, slug)
    if portfolio is None:
        return False
    await delete(db, portfolio)
    return True


async def reorder_records(db: AsyncSession, ordered_slugs: list[str]) -> list[PortfolioRecord]:
    """Writes ``sort`` positions from *ordered_slugs* and returns the records.

    Args:
        db: Active async DB session.
        ordered_slugs: Portfolio slugs in desired order (index = ``sort``).

    Returns:
        All portfolios re-sorted by ``sort`` ASC as records.
    """
    await reorder(db, ordered_slugs)
    return await list_records(db)

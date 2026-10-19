"""Business logic for the admin portfolio CRUD API (gjo_se_com).

Handles slug normalization (via ``slugify``, the SSOT), collision checks,
payload transformation (structure + translation-table pattern) and CRUD. All
DB/ORM access is delegated to the repositories, which return service-boundary
records; no query or ORM model is built here (Achse 2: ``services`` >
``repositories``).
"""

import logging
from collections.abc import Mapping
from dataclasses import dataclass

from app.portfolio.domain.portfolio_contract import PortfolioRecord, ProofRecord
from app.portfolio.exceptions import (
    PortfolioNotFoundError,
    PortfolioSlugConflictError,
    ProofNotFoundError,
)
from app.portfolio.repositories import (
    portfolio_admin_repository,
    portfolio_proof_repository,
    portfolio_repository,
    portfolio_status_repository,
)
from app.portfolio.schemas.portfolio_schemas import (
    LocaleFieldsOut,
    PortfolioAdminCreate,
    PortfolioAdminOut,
    PortfolioAdminUpdate,
    PortfolioReorderRequest,
    PortfolioTranslationUpdate,
)
from app.portfolio.schemas.proof_schemas import (
    ProofAdminOut,
    ProofCreate,
    ProofReorderRequest,
    ProofUpdate,
)
from app.shared.db_access.session_types import AsyncSession
from app.shared.slugify.slugify import slugify

logger = logging.getLogger(__name__)

REQUIRED_LOCALE = "de"


def _require_german_translation(
    translations: Mapping[str, LocaleFieldsOut],
) -> None:
    """Raises a ValueError when the mandatory German translation is missing.

    Args:
        translations: Locale → localized fields mapping from the payload.

    Raises:
        ValueError: If ``de`` is not a key in ``translations``.
    """
    if REQUIRED_LOCALE not in translations:
        raise ValueError(f"Mindestens eine '{REQUIRED_LOCALE}'-Übersetzung ist erforderlich")


def _require_german_statement(statements: Mapping[str, str]) -> None:
    """Raises a ValueError when the mandatory German statement is missing.

    Args:
        statements: Locale → statement mapping from the payload.

    Raises:
        ValueError: If ``de`` is not a key in ``statements``.
    """
    if REQUIRED_LOCALE not in statements:
        raise ValueError(f"Mindestens eine '{REQUIRED_LOCALE}'-Aussage ist erforderlich")


def to_proof_admin_out(proof: ProofRecord) -> ProofAdminOut:
    """Maps a proof record to the admin DTO.

    Args:
        proof: Proof record with all localized statement rows.

    Returns:
        A ProofAdminOut with ``image_src``, ``sort`` and all statements.
    """
    return ProofAdminOut(
        id=proof.id,
        image_src=proof.image_src,
        sort=proof.sort,
        statements={t.locale: t.statement for t in proof.translations},
        priority=proof.priority,
        questions={t.locale: t.question for t in proof.translations if t.question is not None},
    )


@dataclass
class PortfolioRow:
    """Read-Model: portfolio record + per Join aufgelöste Status-Felder.

    Trägt ``status``/``status_color_token`` explizit, statt sie als dynamische
    Runtime-Attribute an das ORM-Modell zu hängen (Repository = Datenzugriff,
    Read-Model = Projektion).
    """

    portfolio: PortfolioRecord
    status: str | None = None
    status_color_token: str | None = None


def to_admin_out(row: PortfolioRow) -> PortfolioAdminOut:
    """Maps a portfolio read-model (record + projected status) to the admin DTO.

    Args:
        row: Read-model with all translations and the resolved status.

    Returns:
        A PortfolioAdminOut with structure fields and all translations.
    """
    portfolio = row.portfolio
    return PortfolioAdminOut(
        id=portfolio.id,
        slug=portfolio.slug,
        image=portfolio.image,
        link_url=portfolio.link_url,
        link_label=portfolio.link_label,
        year=portfolio.year,
        sort=portfolio.sort,
        status=row.status,
        status_color_token=row.status_color_token,
        translations={
            t.locale: LocaleFieldsOut(
                title=t.title,
                sub_title=t.sub_title,
                teaser=t.teaser,
                impact_summary=t.impact_summary,
            )
            for t in portfolio.translations
        },
    )


def _status_row(
    portfolio: PortfolioRecord,
    entry: tuple[str | None, str | None] | None,
) -> PortfolioRow:
    """Builds a portfolio read-model from a resolved status entry.

    Args:
        portfolio: Portfolio record.
        entry: ``(status_name, color_token)`` or ``None`` when unresolved.

    Returns:
        ``PortfolioRow`` carrying the record and the projected status fields.
    """
    return PortfolioRow(
        portfolio=portfolio,
        status=entry[0] if entry else None,
        status_color_token=entry[1] if entry else None,
    )


async def list_portfolios(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "sort",
    sort_order: str = "asc",
) -> list[PortfolioAdminOut]:
    """Returns a paginated page of portfolios (with translations) for the admin view.

    Args:
        db: Active async DB session.
        q: Search term matching ``slug`` or the German ``title`` via ILIKE.
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Sort key (structure field or ``title``).
        sort_order: ``asc`` or ``desc``.

    Returns:
        The requested page of PortfolioAdminOut.
    """
    portfolios = await portfolio_admin_repository.list_records(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    status_map = await portfolio_status_repository.resolve_status_map(db, [p.id for p in portfolios])
    return [to_admin_out(_status_row(p, status_map.get(p.id))) for p in portfolios]


async def count_portfolios(db: AsyncSession, q: str | None = None) -> int:
    """Returns the total portfolio count, optionally filtered by search.

    Args:
        db: Active async DB session.
        q: Search term matching ``slug`` or the German ``title`` via ILIKE.

    Returns:
        Total number of matching portfolios.
    """
    return await portfolio_admin_repository.count(db, q=q)


async def reorder_portfolios(
    db: AsyncSession,
    payload: PortfolioReorderRequest,
) -> list[PortfolioAdminOut]:
    """Reorders all portfolios based on the ordered slug list.

    Args:
        db: Active async DB session.
        payload: Validated reorder payload (ordered portfolio slugs).

    Returns:
        The re-sorted list of PortfolioAdminOut.
    """
    portfolios = await portfolio_repository.reorder_records(db, payload.ordered_slugs)
    status_map = await portfolio_status_repository.resolve_status_map(db, [p.id for p in portfolios])
    return [to_admin_out(_status_row(p, status_map.get(p.id))) for p in portfolios]


async def _require_portfolio(db: AsyncSession, slug: str) -> PortfolioRecord:
    """Returns the portfolio record for *slug* or raises a 404.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.

    Returns:
        The matching portfolio record.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
    """
    portfolio = await portfolio_repository.get_record_by_slug(db, slug)
    if portfolio is None:
        logger.warning("portfolio not found: slug=%s", slug)
        raise PortfolioNotFoundError(f"Portfolio mit Slug '{slug}' nicht gefunden")
    return portfolio


async def get_portfolio(db: AsyncSession, slug: str) -> PortfolioRow:
    """Returns a single portfolio read-model (with translations) by slug.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.

    Returns:
        The matching ``PortfolioRow`` (record + resolved status).

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
    """
    portfolio = await _require_portfolio(db, slug)
    entry = await portfolio_status_repository.resolve_status(db, portfolio.id)
    return PortfolioRow(
        portfolio=portfolio,
        status=entry[0] if entry else None,
        status_color_token=entry[1] if entry else None,
    )


async def create_portfolio(db: AsyncSession, payload: PortfolioAdminCreate) -> PortfolioRecord:
    """Creates a portfolio project with its translations.

    Args:
        db: Active async DB session.
        payload: Validated create payload (structure + translations).

    Returns:
        The created portfolio record.

    Raises:
        ValueError: If the mandatory German translation is missing.
        PortfolioSlugConflictError: If the normalized slug is already taken.
    """
    _require_german_translation(payload.translations)
    normalized_slug = slugify(payload.slug)
    if await portfolio_repository.slug_exists(db, normalized_slug):
        logger.warning("portfolio slug conflict: slug=%s", normalized_slug)
        raise PortfolioSlugConflictError(f"Portfolio mit Slug '{normalized_slug}' existiert bereits")

    return await portfolio_repository.create_record(
        db,
        slug=normalized_slug,
        image=payload.image,
        link_url=payload.link_url,
        link_label=payload.link_label,
        year=payload.year,
        sort=payload.sort,
        translations=payload.translations,
    )


async def update_portfolio(db: AsyncSession, slug: str, payload: PortfolioAdminUpdate) -> PortfolioRecord:
    """Partially updates a portfolio project and replaces its translations.

    Args:
        db: Active async DB session.
        slug: Current slug of the portfolio to update.
        payload: Validated partial-update payload.

    Returns:
        The updated portfolio record.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
        ValueError: If the provided translations miss German.
        PortfolioSlugConflictError: If a new slug collides with another project.
    """
    portfolio = await _require_portfolio(db, slug)

    # ``translations`` is extracted separately (and excluded from the item dump)
    # so the LocaleFieldsOut instances are preserved – ``model_dump`` would flatten
    # them into plain dicts, which ``replace_translations`` cannot dump again.
    updates = payload.model_dump(exclude_unset=True, exclude={"translations"})
    if "slug" in updates and updates["slug"] is not None:
        normalized_slug = slugify(updates["slug"])
        if await portfolio_repository.slug_exists(db, normalized_slug, exclude_id=portfolio.id):
            logger.warning("portfolio slug conflict on update: slug=%s", normalized_slug)
            raise PortfolioSlugConflictError(f"Portfolio mit Slug '{normalized_slug}' existiert bereits")
        updates["slug"] = normalized_slug

    translations = payload.translations
    if translations is not None:
        _require_german_translation(translations)

    updated = await portfolio_repository.update_record(
        db,
        portfolio.id,
        updates=updates,
        translations=translations,
    )
    if updated is None:
        raise PortfolioNotFoundError(f"Portfolio mit Slug '{slug}' nicht gefunden")
    return updated


async def update_translation(
    db: AsyncSession,
    slug: str,
    locale: str,
    payload: PortfolioTranslationUpdate,
) -> PortfolioRecord:
    """Partially updates the translation row for *locale* of a portfolio.

    Merges the provided fields into the existing locale row (or creates a new
    row for a not-yet-existing locale, falling back to the German title) and
    replaces the translation set via the translation-table pattern. The
    mandatory German row is never removed.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.
        locale: Target locale (e.g. ``de`` or ``en``).
        payload: Validated partial translation update.

    Returns:
        The updated portfolio record.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
    """
    portfolio = await _require_portfolio(db, slug)
    current = {
        t.locale: LocaleFieldsOut(
            title=t.title,
            sub_title=t.sub_title,
            teaser=t.teaser,
            impact_summary=t.impact_summary,
        )
        for t in portfolio.translations
    }
    updates = payload.model_dump(exclude_unset=True)
    existing = current.get(locale)
    if existing is None:
        # New locale row – title is required (min 1 char); fall back to German.
        de_locale = current.get(REQUIRED_LOCALE)
        fallback_title = de_locale.title if de_locale is not None else ""
        base: dict[str, object] = {"title": updates.get("title") or fallback_title}
        base.update({k: v for k, v in updates.items() if k != "title"})
        current[locale] = LocaleFieldsOut.model_validate(base)
    else:
        merged = existing.model_dump()
        for key, value in updates.items():
            if key == "title" and not value:
                continue  # keep existing title (required field)
            merged[key] = value
        current[locale] = LocaleFieldsOut.model_validate(merged)

    _require_german_translation(current)
    updated = await portfolio_repository.update_record(
        db,
        portfolio.id,
        updates={},
        translations=current,
    )
    if updated is None:
        raise PortfolioNotFoundError(f"Portfolio mit Slug '{slug}' nicht gefunden")
    return updated


async def delete_portfolio(db: AsyncSession, slug: str) -> None:
    """Deletes a portfolio project (proofs + translations cascade).

    Args:
        db: Active async DB session.
        slug: Slug of the portfolio to delete.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
    """
    if not await portfolio_repository.delete_by_slug(db, slug):
        logger.warning("portfolio not found: slug=%s", slug)
        raise PortfolioNotFoundError(f"Portfolio mit Slug '{slug}' nicht gefunden")


async def require_proof(db: AsyncSession, portfolio_id: int, proof_id: int) -> ProofRecord:
    """Returns a proof record scoped to *portfolio_id* or raises a 404.

    Shared by the admin and image services (previously duplicated as
    ``_require_proof``).

    Args:
        db: Active async DB session.
        portfolio_id: The proof's owning portfolio id.
        proof_id: The portfolio_proof id.

    Returns:
        The matching proof record (with translations).

    Raises:
        ProofNotFoundError: If the proof does not exist or belongs to another
            portfolio.
    """
    proof = await portfolio_proof_repository.get_proof_record(db, proof_id)
    if proof is None or proof.portfolio_id != portfolio_id:
        logger.warning("proof not found: portfolio_id=%s proof_id=%s", portfolio_id, proof_id)
        raise ProofNotFoundError(f"Proof mit id '{proof_id}' nicht gefunden")
    return proof


async def list_proofs(db: AsyncSession, slug: str) -> list[ProofAdminOut]:
    """Returns a portfolio's proofs (with statements) for the admin view.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.

    Returns:
        List of ProofAdminOut sorted by ``sort`` ASC.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
    """
    portfolio = await _require_portfolio(db, slug)
    proofs = await portfolio_proof_repository.list_proof_records(db, portfolio.id)
    return [to_proof_admin_out(p) for p in proofs]


async def create_proof(db: AsyncSession, slug: str, payload: ProofCreate) -> ProofRecord:
    """Creates a proof with its localized statements (auto-assigned sort).

    Args:
        db: Active async DB session.
        slug: Slug of the owning portfolio.
        payload: Validated create payload (image + statements).

    Returns:
        The created proof record.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
        ValueError: If the mandatory German statement is missing.
    """
    portfolio = await _require_portfolio(db, slug)
    _require_german_statement(payload.statements)
    max_sort = await portfolio_proof_repository.get_max_proof_sort(db, portfolio.id)
    return await portfolio_proof_repository.create_proof_record(
        db,
        portfolio_id=portfolio.id,
        image_src=payload.image_src,
        sort=max_sort + 1,
        priority=payload.priority,
        statements=payload.statements,
        questions=payload.questions,
    )


async def update_proof(db: AsyncSession, slug: str, proof_id: int, payload: ProofUpdate) -> ProofRecord:
    """Partially updates a proof and replaces its statements when provided.

    Args:
        db: Active async DB session.
        slug: Slug of the owning portfolio.
        proof_id: The portfolio_proof id.
        payload: Validated partial-update payload.

    Returns:
        The updated proof record.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
        ProofNotFoundError: If the proof does not belong to the portfolio.
        ValueError: If the provided statements miss German.
    """
    portfolio = await _require_portfolio(db, slug)
    await require_proof(db, portfolio.id, proof_id)

    updates = payload.model_dump(exclude_unset=True, exclude={"statements", "questions"})
    if payload.statements is not None:
        _require_german_statement(payload.statements)

    updated = await portfolio_proof_repository.update_proof_record(
        db,
        proof_id,
        updates=updates,
        statements=payload.statements,
        questions=payload.questions,
    )
    if updated is None:
        raise ProofNotFoundError(f"Proof mit id '{proof_id}' nicht gefunden")
    return updated


async def delete_proof(db: AsyncSession, slug: str, proof_id: int) -> None:
    """Deletes a proof (statements cascade via relationship).

    Args:
        db: Active async DB session.
        slug: Slug of the owning portfolio.
        proof_id: The portfolio_proof id.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
        ProofNotFoundError: If the proof does not belong to the portfolio.
    """
    portfolio = await _require_portfolio(db, slug)
    await require_proof(db, portfolio.id, proof_id)
    await portfolio_proof_repository.delete_proof_record(db, proof_id)


async def reorder_proofs(db: AsyncSession, slug: str, payload: ProofReorderRequest) -> list[ProofAdminOut]:
    """Reorders a portfolio's proofs based on the ordered id list.

    Args:
        db: Active async DB session.
        slug: Slug of the owning portfolio.
        payload: Validated reorder payload (ordered proof ids).

    Returns:
        The re-sorted list of ProofAdminOut.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
    """
    portfolio = await _require_portfolio(db, slug)
    proofs = await portfolio_proof_repository.reorder_proof_records(db, portfolio.id, payload.ordered_ids)
    return [to_proof_admin_out(p) for p in proofs]


async def get_proof_admin(db: AsyncSession, slug: str, proof_id: int) -> ProofAdminOut:
    """Reloads a single proof (with statements) and serializes it as admin DTO.

    Intended to be called after ``db.commit()``, where the record from
    create/update must be re-fetched.

    Args:
        db: Active async DB session.
        slug: Slug of the owning portfolio.
        proof_id: The portfolio_proof id.

    Returns:
        A freshly loaded ProofAdminOut.

    Raises:
        PortfolioNotFoundError: If no portfolio with *slug* exists.
        ProofNotFoundError: If the proof does not belong to the portfolio.
    """
    portfolio = await _require_portfolio(db, slug)
    proof = await require_proof(db, portfolio.id, proof_id)
    return to_proof_admin_out(proof)

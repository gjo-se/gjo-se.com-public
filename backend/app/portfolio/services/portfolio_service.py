"""Business logic for localized public portfolio reads (gjo_se_com).

Resolves the requested locale and falls back to German when the requested
locale's translation is missing. Assembles flat output DTOs from the
service-boundary records returned by the repositories; no DB query or ORM is
built here (Achse 2: ``services`` > ``repositories``).
"""

import logging
from collections.abc import Sequence
from typing import Protocol

from app.portfolio.domain.portfolio_contract import (
    PortfolioRecord,
    ProofRecord,
)
from app.portfolio.exceptions import PortfolioNotFoundError
from app.portfolio.repositories import (
    portfolio_proof_repository,
    portfolio_repository,
    portfolio_status_repository,
)
from app.portfolio.schemas.portfolio_schemas import (
    PortfolioListItemOut,
    PortfolioPublicOut,
)
from app.portfolio.schemas.proof_schemas import ProofOut
from app.shared.db_access.session_types import AsyncSession

logger = logging.getLogger(__name__)

FALLBACK_LOCALE = "de"

#: Status-Name, der ein Portfolio öffentlich ausblendet (via core_statusable).
INACTIVE_STATUS = "inactive"


class _Localized(Protocol):
    """Structural type for a record carrying a ``locale`` discriminator."""

    @property
    def locale(self) -> str:
        """Locale code of the translation record."""
        ...


def _pick_translation[LocalizedT: _Localized](translations: Sequence[LocalizedT], locale: str) -> LocalizedT | None:
    """Returns the translation matching ``locale``, falling back to German.

    Args:
        translations: Localized translation records for one entity.
        locale: Requested locale (``de`` or ``en``).

    Returns:
        The translation record for the requested locale, else the German
        translation, else None.
    """
    requested = next((t for t in translations if t.locale == locale), None)
    if requested is not None:
        return requested
    return next((t for t in translations if t.locale == FALLBACK_LOCALE), None)


def _to_list_item(portfolio: PortfolioRecord, locale: str) -> PortfolioListItemOut:
    """Maps a portfolio record to a localized list item DTO.

    Args:
        portfolio: Portfolio record with all localized translation rows.
        locale: Requested locale.

    Returns:
        A PortfolioListItemOut with localized text fields and its own image.
    """
    translation = _pick_translation(portfolio.translations, locale)
    return PortfolioListItemOut(
        slug=portfolio.slug,
        title=translation.title if translation else portfolio.slug,
        sub_title=translation.sub_title if translation else None,
        teaser=translation.teaser if translation else None,
        impact_summary=translation.impact_summary if translation else None,
        year=portfolio.year,
        image=portfolio.image,
    )


def _to_public(portfolio: PortfolioRecord, locale: str) -> PortfolioPublicOut:
    """Maps a portfolio record to a localized public detail DTO.

    Args:
        portfolio: Portfolio record with all localized translation rows.
        locale: Requested locale.

    Returns:
        A PortfolioPublicOut with localized header fields.
    """
    translation = _pick_translation(portfolio.translations, locale)
    return PortfolioPublicOut(
        slug=portfolio.slug,
        title=translation.title if translation else portfolio.slug,
        sub_title=translation.sub_title if translation else None,
        impact_summary=translation.impact_summary if translation else None,
        year=portfolio.year,
        image=portfolio.image,
        link_url=portfolio.link_url,
        link_label=portfolio.link_label,
    )


def _to_proof(proof: ProofRecord, locale: str) -> ProofOut:
    """Maps a proof record to a localized proof DTO.

    Args:
        proof: Proof record with all localized statement rows.
        locale: Requested locale.

    Returns:
        A ProofOut with the localized statement.
    """
    translation = _pick_translation(proof.translations, locale)
    statement = translation.statement if translation else None
    question = translation.question if translation else None
    return ProofOut(
        id=proof.id,
        image_src=proof.image_src,
        statement=statement,
        priority=proof.priority,
        question=question,
    )


async def list_portfolios(db: AsyncSession, locale: str) -> list[PortfolioListItemOut]:
    """Returns all active portfolios as localized list items, sorted by ``sort`` ASC.

    Portfolios with the ``inactive`` status are excluded from the public list.

    Args:
        db: Active async DB session.
        locale: Requested locale (``de`` or ``en``).

    Returns:
        List of PortfolioListItemOut for active portfolios only.
    """
    portfolios = await portfolio_repository.list_records(db)
    status_names = await portfolio_status_repository.resolve_status_names(
        db, [portfolio.id for portfolio in portfolios]
    )
    visible = [p for p in portfolios if status_names.get(p.id) != INACTIVE_STATUS]
    return [_to_list_item(p, locale) for p in visible]


async def get_portfolio(db: AsyncSession, slug: str, locale: str) -> PortfolioPublicOut:
    """Returns a single active portfolio as a localized public detail.

    Raises:
        PortfolioNotFoundError: If no portfolio with the given slug exists or
            the portfolio is inactive (publicly hidden).
    """
    portfolio = await portfolio_repository.get_record_by_slug(db, slug)
    if portfolio is None or await portfolio_status_repository.is_inactive(db, portfolio.id):
        logger.warning("portfolio not found or inactive: slug=%s", slug)
        raise PortfolioNotFoundError(f"Portfolio mit Slug '{slug}' nicht gefunden")
    return _to_public(portfolio, locale)


async def get_proofs(db: AsyncSession, slug: str, locale: str) -> list[ProofOut]:
    """Returns the proofs of an active portfolio as localized DTOs.

    Args:
        db: Active async DB session.
        slug: Globally unique portfolio slug.
        locale: Requested locale (``de`` or ``en``).

    Returns:
        List of ProofOut sorted by ``sort`` ASC.

    Raises:
        PortfolioNotFoundError: If no portfolio with the given slug exists or
            the portfolio is inactive (publicly hidden).
    """
    portfolio = await portfolio_repository.get_record_by_slug(db, slug)
    if portfolio is None or await portfolio_status_repository.is_inactive(db, portfolio.id):
        logger.warning("portfolio not found or inactive (proofs): slug=%s", slug)
        raise PortfolioNotFoundError(f"Portfolio mit Slug '{slug}' nicht gefunden")
    proofs = await portfolio_proof_repository.list_proof_records(db, portfolio.id)
    return [_to_proof(p, locale) for p in proofs]

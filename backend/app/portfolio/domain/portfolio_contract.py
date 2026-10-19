"""Service-boundary records (DTOs) for the portfolio context.

The repository layer maps SQLAlchemy rows to these immutable records so the
service layer stays free of ``app.portfolio.models`` imports (Achse 2:
``services`` > ``repositories``). They are plain dataclasses (not Pydantic) so
no ORM coupling leaks into the generated frontend schemas and the service
boundary is an explicit, typed read model rather than the ORM entities.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TranslationRecord:
    """Service-boundary view of one localized portfolio translation row.

    Attributes:
        locale: Locale code (e.g. ``de`` or ``en``).
        title: Localized title (required).
        sub_title: Optional localized sub-title.
        teaser: Optional localized teaser.
        impact_summary: Optional localized impact summary.
    """

    locale: str
    title: str
    sub_title: str | None = None
    teaser: str | None = None
    impact_summary: str | None = None


@dataclass(frozen=True, slots=True)
class ProofTranslationRecord:
    """Service-boundary view of one localized proof translation row.

    Attributes:
        locale: Locale code (e.g. ``de`` or ``en``).
        statement: Localized statement text.
        question: Optional localized trust question.
    """

    locale: str
    statement: str
    question: str | None = None


@dataclass(frozen=True, slots=True)
class ProofRecord:
    """Service-boundary view of a portfolio proof (with localized statements).

    Attributes:
        id: Primary key of the proof.
        portfolio_id: Id of the owning portfolio.
        image_src: Storage key of the proof image, or ``None``.
        sort: Ordering index within the portfolio.
        priority: Proof priority (``high`` or ``medium``).
        translations: All localized statement/question rows of the proof.
    """

    id: int
    portfolio_id: int
    image_src: str | None
    sort: int
    priority: str
    translations: tuple[ProofTranslationRecord, ...] = ()


@dataclass(frozen=True, slots=True)
class PortfolioRecord:
    """Service-boundary view of a portfolio project (with translations).

    Attributes:
        id: Primary key of the portfolio.
        slug: Globally unique, normalized slug.
        image: Storage key of the hero/teaser image, or ``None``.
        link_url: Optional external link URL.
        link_label: Optional external link label.
        year: Optional year label.
        sort: Ordering index.
        translations: All localized translation rows of the portfolio.
    """

    id: int
    slug: str
    image: str | None
    link_url: str | None
    link_label: str | None
    year: str | None
    sort: int
    translations: tuple[TranslationRecord, ...] = ()

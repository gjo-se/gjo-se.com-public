"""Domain DTOs for the shared technology catalog (Achse 2 service boundary).

These are the value objects the repository layer hands to the service layer so
that ``app/shared/technology_catalog/services/**`` never imports an ORM model
(import-linter "Services do not build DB queries/ORM", K2). The repository maps
its ORM rows onto these records.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EmbeddableTechnology:
    """The minimal technology projection needed to build an embedding text.

    Attributes:
        name: Human-readable technology name.
        type: Technology classification, e.g. ``database``.
        description: Free-text description.
    """

    name: str
    type: str | None
    description: str | None


@dataclass(frozen=True)
class TechnologyEmbeddingRecord(EmbeddableTechnology):
    """An embeddable technology plus the vector-presence flag.

    Attributes:
        id: Primary key of the technology.
        has_vector: ``True`` when a vector is already persisted.
    """

    id: int
    has_vector: bool


@dataclass(frozen=True)
class TechnologyVectorRecord:
    """A technology with a persisted vector, used for similarity search.

    Attributes:
        id: Primary key of the technology.
        name: Human-readable technology name.
        slug: URL-friendly unique identifier.
        type: Technology classification, e.g. ``database``.
        vector: The persisted embedding vector.
    """

    id: int
    name: str
    slug: str
    type: str | None
    vector: list[float]


@dataclass(frozen=True)
class IconDownloadRecord:
    """The icon-download projection: what the downloader needs per icon.

    Attributes:
        id: Primary key of the icon.
        variant: Icon variant, e.g. ``dark`` or ``light``.
        icon_external_id: Catalog source icon identifier.
        slug: Slug of the owning technology (falls back to its id).
    """

    id: int
    variant: str
    icon_external_id: str
    slug: str


@dataclass(frozen=True)
class IconFailureRecord:
    """The failure-tracking projection for an icon download retry.

    Attributes:
        id: Primary key of the icon.
        retry_count: Number of attempts recorded so far.
    """

    id: int
    retry_count: int

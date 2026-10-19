"""Unit tests for dedup ranking and city-explosion rules (pure, no DB).

``rank_masters_by_similarity`` orders masters by cosine similarity and skips
masters without a vector. The city helpers decide whether two locations are the
same job posting. Everything is in-memory.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.fbf.repositories.project_repository import ProjectVectorRef
from app.fbf.schemas.project_freelancer_map_schemas import ProjectFreelancerMapOut
from app.fbf.services import dedup_service
from app.fbf.services.dedup_service import (
    DedupService,
    _cities_exclude,
    _clean_city,
    _is_non_city,
    _levenshtein,
    rank_masters_by_similarity,
)

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)


def _master(url: str, vector: list[float] | None) -> ProjectVectorRef:
    """Build a master read DTO (title carries the url) with the given vector."""
    return ProjectVectorRef(id=0, title=url, city=None, posted_at=None, vector=vector)


def _pm(city: str | None) -> ProjectFreelancerMapOut:
    """Build a raw PM entry DTO with the given city."""
    return ProjectFreelancerMapOut(
        id=1,
        external_id="ext",
        url="https://example.test/pm",
        title="PM",
        description=None,
        agency=None,
        contact_name=None,
        city=city,
        country=None,
        remote_percent=None,
        contract_type=None,
        duration=None,
        start_date=None,
        skills=None,
        industry=None,
        extension_possible=None,
        endcustomer=None,
        search_term_id=None,
        posted_at=_NOW,
        scraped_at=_NOW,
        mapped_at=None,
    )


# ── rank_masters_by_similarity ───────────────────────────────────────────────


def test_rank_masters_by_similarity_orders_descending() -> None:
    """The most similar master is ranked first."""
    near = _master("https://x.test/near", [1.0, 0.0])
    far = _master("https://x.test/far", [0.0, 1.0])

    ranked = rank_masters_by_similarity([1.0, 0.0], [far, near])

    assert [project.title for project, _ in ranked] == ["https://x.test/near", "https://x.test/far"]
    assert ranked[0][1] == pytest.approx(1.0)


def test_rank_masters_by_similarity_skips_masters_without_vector() -> None:
    """Masters without a stored vector are excluded from the ranking."""
    with_vector = _master("https://x.test/with", [1.0, 0.0])
    without_vector = _master("https://x.test/without", None)

    ranked = rank_masters_by_similarity([1.0, 0.0], [with_vector, without_vector])

    assert [project.title for project, _ in ranked] == ["https://x.test/with"]


def test_rank_masters_by_similarity_empty_input_returns_empty() -> None:
    """No masters yields an empty ranking."""
    assert rank_masters_by_similarity([1.0, 0.0], []) == []


# ── _is_non_city (EP) ────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("cleaned", "expected"),
    [
        ("berlin", False),
        ("münchen", False),
        ("deutschland", True),
        ("remote", True),
        ("kanton aargau", True),
        ("d7", True),
        ("1130 wien", True),
        ("", True),
    ],
)
def test_is_non_city_classifies_city_like_values(cleaned: str, expected: bool) -> None:
    """Countries, remote markers, PLZ codes and empty values are not cities."""
    assert _is_non_city(cleaned) is expected


# ── _cities_exclude (decision table) ─────────────────────────────────────────


def test_cities_exclude_false_when_cities_match() -> None:
    """Identical real cities do not exclude a match."""
    assert _cities_exclude(_pm("Berlin"), _master("https://x.test/1", None)) is False


def test_cities_exclude_true_when_real_cities_differ() -> None:
    """Two different real cities are a hard exclusion."""
    project = _master("https://x.test/1", None)
    project.city = "Munich"

    assert _cities_exclude(_pm("Berlin"), project) is True


def test_cities_exclude_false_when_one_side_is_non_city() -> None:
    """A non-city value (country) does not exclude a match."""
    project = _master("https://x.test/1", None)
    project.city = "Munich"

    assert _cities_exclude(_pm("deutschland"), project) is False


def test_cities_exclude_false_for_near_identical_cities() -> None:
    """Levenshtein distance 1 (Bern/Berne) is treated as the same city."""
    project = _master("https://x.test/1", None)
    project.city = "Berne"

    assert _cities_exclude(_pm("Bern"), project) is False


# ── _levenshtein / _clean_city ───────────────────────────────────────────────


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        ("kitten", "sitting", 3),
        ("bern", "berne", 1),
        ("abc", "abc", 0),
        ("", "abc", 3),
        ("ab", "ba", 2),
    ],
)
def test_levenshtein_distances(a: str, b: str, expected: int) -> None:
    """The Levenshtein distance matches the reference values."""
    assert _levenshtein(a, b) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("München (81249)", "münchen"),
        ("  Berlin ", "berlin"),
        ("", ""),
        (None, ""),
    ],
)
def test_clean_city_strips_parenthetical_and_whitespace(raw: str | None, expected: str) -> None:
    """A lowercase city without parenthetical noise is returned."""
    assert _clean_city(raw) == expected


# ── find_similar_project (loop + filters) ────────────────────────────────────


class _Embed:
    """Embedding-client double returning a fixed vector."""

    async def embed_text(self, _text: str, _db: object) -> list[float]:
        return [1.0, 0.0]


class _DBSessionCM:
    """Async context-manager double standing in for the core DB session."""

    async def __aenter__(self) -> object:
        return object()

    async def __aexit__(self, *_exc: object) -> bool:
        return False


def _patch_dedup(monkeypatch: pytest.MonkeyPatch, masters: list[ProjectVectorRef]) -> DedupService:
    """Wire build-text, master loading and the core session for find_similar_project."""
    monkeypatch.setattr(dedup_service, "build_embedding_text", lambda _entry: "text")
    for index, master in enumerate(masters):
        master.id = index + 10

    async def _load(_db: object) -> list[ProjectVectorRef]:
        return masters

    monkeypatch.setattr(dedup_service.project_repository, "get_master_vector_refs", _load)
    monkeypatch.setattr(dedup_service.project_repository, "open_core_session", _DBSessionCM)
    return DedupService(_Embed())


def _entry(city: str | None) -> ProjectFreelancerMapOut:
    """Build a PM entry DTO with a concrete id (log format requires an int)."""
    return _pm(city)


@pytest.mark.asyncio
async def test_find_similar_project_returns_best_match(monkeypatch: pytest.MonkeyPatch) -> None:
    """A similar master in the same city is returned and counted as a match."""
    master = _master("https://x.test/m", [1.0, 0.0])
    master.city = "Berlin"
    service = _patch_dedup(monkeypatch, [master])

    result = await service.find_similar_project(_entry("Berlin"), None)

    assert result is not None
    assert result[0] is master
    assert result[1] == pytest.approx(1.0)
    assert service.get_stats() == {"searches": 1, "matches": 1}


@pytest.mark.asyncio
async def test_find_similar_project_below_threshold_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    """A master below the similarity threshold is not a match."""
    master = _master("https://x.test/m", [0.0, 1.0])
    master.city = "Berlin"
    service = _patch_dedup(monkeypatch, [master])

    assert await service.find_similar_project(_entry("Berlin"), None) is None
    assert service.get_stats() == {"searches": 1, "matches": 0}


@pytest.mark.asyncio
async def test_find_similar_project_city_mismatch_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    """A similar master in a different city is excluded."""
    master = _master("https://x.test/m", [1.0, 0.0])
    master.city = "Munich"
    service = _patch_dedup(monkeypatch, [master])

    assert await service.find_similar_project(_entry("Berlin"), None) is None


@pytest.mark.asyncio
async def test_find_similar_project_age_mismatch_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    """A similar master posted too far in the past is excluded."""
    master = _master("https://x.test/m", [1.0, 0.0])
    master.city = "Berlin"
    master.posted_at = _NOW
    service = _patch_dedup(monkeypatch, [master])
    entry = _entry("Berlin")
    entry.posted_at = datetime(2026, 2, 1, tzinfo=UTC)

    assert await service.find_similar_project(entry, None) is None

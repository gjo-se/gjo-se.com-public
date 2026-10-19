"""Dedup-Service – Cosine-Similarity-Suche gegen Project-Vektoren in Postgres.

Findet das beste kanonische Project zu einem ``ProjectFreelancerMap``-Eintrag
ueber semantisches Embedding-Matching (``project.vector`` + Python-Cosine).
"""

from __future__ import annotations

import os

import structlog

from app.fbf.repositories import project_repository
from app.fbf.repositories.project_repository import ProjectVectorRef
from app.fbf.schemas.project_freelancer_map_schemas import ProjectFreelancerMapOut
from app.fbf.services.embedding_service import build_embedding_text
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.domain.embedding_consumer_contract import EmbeddingClientConsumer
from app.shared.embedding.domain.similarity_rules import cosine_similarity
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient

logger = structlog.get_logger(__name__)

_DEDUP_THRESHOLD: float = float(os.environ.get("DEDUP_THRESHOLD", "0.80"))
_DEDUP_TOP_K: int = int(os.environ.get("DEDUP_TOP_K", "5"))
_DEDUP_MAX_AGE_DAYS: int = int(os.environ.get("DEDUP_MAX_AGE_DAYS", "7"))
_FUZZY_MIN_LEN: int = 4  # Levenshtein threshold – only compare cities >= 4 chars
_CITY_PREFIX_LEN: int = 2  # Skip values like "D7", "D8" (letter + digit)

# Values in the city field that are not real cities (countries, regions, codes,
# remote indicators).  Derived from production data.
_NON_CITY_VALUES: frozenset[str] = frozenset(
    {
        # ── Remote / generic ──
        "anywhere",
        "keine angabe",
        # ── Countries ──
        "de",
        "deutschland",
        "europa",
        "germany",
        "schweiz",
        "switzerland",
        "österreich",
        # ── DE Bundesländer (excluding Berlin/Hamburg/Bremen – those are cities) ──
        "baden-württemberg",
        "bayern",
        "brandenburg",
        "hessen",
        "mecklenburg-vorpommern",
        "niedersachsen",
        "nordrhein-westfalen",
        "nrw",
        "oberbayern",
        "ostwestfalen",
        "rheinland",
        "rheinland-pfalz",
        "rhein-neckar",
        "rhein-neckar-gebiet",
        "saarland",
        "sachsen",
        "sachsen-anhalt",
        "schleswig-holstein",
        "süddeutschland",
        "thüringen",
        # ── AT Bundesländer (excluding Wien/Salzburg – those are cities) ──
        "burgenland",
        "kärnten",
        "niederösterreich",
        "oberösterreich",
        "steiermark",
        "tirol",
        "vorarlberg",
        # ── CH Kantone (plus generic "kanton" prefix handled below) ──
        "kanton aargau",
        # ── DE PLZ-Regionen ──
        "d0",
        "d1",
        "d2",
        "d3",
        "d4",
        "d5",
        "d6",
        "d7",
        "d8",
        "d9",
    }
)


def _clean_city(raw: str | None) -> str:
    """Normalise a city string by removing parenthetical noise and extra whitespace."""
    if not raw:
        return ""
    cleaned = raw.strip().lower()
    # Remove "(...)" suffix, e.g. "München (81249)", "Freiburg im Breisgau (79098)"
    idx = cleaned.rfind(" (")
    if idx > 0:
        cleaned = cleaned[:idx]
    return cleaned


def _is_non_city(cleaned: str) -> bool:
    """Return True if the cleaned city value is not a real city name."""
    if not cleaned:
        return True
    if "remote" in cleaned:
        return True
    if cleaned.startswith("kanton "):
        return True
    # PLZ-like: starts with digit(s) or single letter + digit(s), e.g. "4xxxxx", "1130 Wien", "D7"
    if cleaned[0].isdigit():
        return True
    if len(cleaned) >= _CITY_PREFIX_LEN and cleaned[0].isalpha() and cleaned[1].isdigit():
        return True
    return cleaned in _NON_CITY_VALUES


def _cities_exclude(freelancermap_entry: ProjectFreelancerMapOut, project: ProjectVectorRef) -> bool:
    """Return True if the two entries have different, non-null cities.

    A city mismatch is a hard exclusion: projects in different cities
    cannot be the same job posting.

    Non-city values (countries, regions, "remote") are treated as NULL
    and do not cause exclusion.
    """
    pm_city = _clean_city(freelancermap_entry.city)
    proj_city = _clean_city(project.city)

    # If either side is a non-city, allow the match.
    if _is_non_city(pm_city) or _is_non_city(proj_city):
        return False

    # Both are real cities – compare.
    if pm_city == proj_city:
        return False

    # Fuzzy: Levenshtein ≤ 1 for strings ≥ FUZZY_MIN_LEN (e.g. Bern/Berne).
    return not (
        len(pm_city) >= _FUZZY_MIN_LEN and len(proj_city) >= _FUZZY_MIN_LEN and _levenshtein(pm_city, proj_city) <= 1
    )


def _levenshtein(a: str, b: str) -> int:
    """Levenshtein edit distance between two strings."""
    if len(a) < len(b):
        a, b = b, a
    # a is the longer string
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(
                min(
                    prev[j] + 1,  # deletion
                    curr[j - 1] + 1,  # insertion
                    prev[j - 1] + (0 if ca == cb else 1),  # substitution
                )
            )
        prev = curr
    return prev[-1]


def rank_masters_by_similarity(
    vector: list[float],
    masters: list[ProjectVectorRef],
) -> list[tuple[ProjectVectorRef, float]]:
    """Ranks master projects by cosine similarity to *vector*, descending.

    Masters without a stored vector are skipped. Shared by the dedup search
    and the Cousin lookup.

    Args:
        vector: Query embedding.
        masters: Master projects to rank.

    Returns:
        ``(project, similarity)`` tuples, most similar first.
    """
    ranked: list[tuple[ProjectVectorRef, float]] = []
    for master in masters:
        if master.vector is None:
            continue
        ranked.append((master, cosine_similarity(vector, master.vector)))
    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked


class DedupService(EmbeddingClientConsumer[EmbeddingClient]):
    """Semantischer Dedup via Cosine-Similarity gegen ``project.vector``.

    Sucht den Freelancermap-Eintrag als Embedding-Vektor gegen alle
    Master-Projects mit Vektor (Postgres) und gibt das beste kanonische
    ``Project`` oberhalb des Similarity-Thresholds zurueck.

    Konfiguration via ``.env``:
    - ``DEDUP_THRESHOLD`` (float, default 0.80)
    - ``DEDUP_TOP_K`` (int, default 5)
    """

    def __init__(self, embedding_client: EmbeddingClient) -> None:
        super().__init__(embedding_client)
        self._searches: int = 0
        self._matches: int = 0

    def get_stats(self) -> dict[str, int]:
        """Returns dedup statistics for the current run.

        Returns:
            Dict with ``searches`` (total cosine-similarity lookups) and
            ``matches`` (entries matched above threshold).
        """
        return {"searches": self._searches, "matches": self._matches}

    async def find_similar_project(
        self, raw_entry: ProjectFreelancerMapOut, db: AsyncSession
    ) -> tuple[ProjectVectorRef, float] | None:
        """Cosine-Similarity-Suche gegen ``project.vector``.

        Args:
            raw_entry: PM-Roheintrag, dessen Embedding gesucht wird.
            db: Async-Session fuer die Project-DB-Abfrage (gjo_se_com).

        Returns:
            Tuple ``(bestes kanonisches Project, Cosine-Similarity)``
            oberhalb ``DEDUP_THRESHOLD``, oder ``None`` falls kein Match.
        """
        self._searches += 1

        # 1. Text konstruieren
        text = build_embedding_text(raw_entry)

        # 2. Embedding via OpenRouter (braucht Core-DB-Session)
        async with project_repository.open_core_session() as core_db:
            vector = await self._embedding_service.embed_text(text, core_db)

        # 3. Alle Master-Project-Vektoren laden (Postgres)
        masters = await project_repository.get_master_vector_refs(db)

        # 4. Cosine-Similarity je Master berechnen, nach Aehnlichkeit sortieren
        ranked = rank_masters_by_similarity(vector, masters)

        # 5. Top-K durchlaufen und Threshold + City-/Age-Logik anwenden
        for project, similarity in ranked[:_DEDUP_TOP_K]:
            if similarity < _DEDUP_THRESHOLD:
                continue

            if _cities_exclude(raw_entry, project):
                logger.debug(
                    "DedupService: City mismatch – entry id=%d (%s) vs project id=%d (%s) – skipping",
                    raw_entry.id,
                    raw_entry.city or "NULL",
                    project.id,
                    project.city or "NULL",
                )
                continue

            # Time-window filter: duplicates must be posted within ±DEDUP_MAX_AGE_DAYS.
            if project.posted_at is not None:
                delta = abs((raw_entry.posted_at - project.posted_at).days)
                if delta > _DEDUP_MAX_AGE_DAYS:
                    logger.debug(
                        "DedupService: Age mismatch – entry id=%d (%s) vs project id=%d (%s) – %d days apart",
                        raw_entry.id,
                        raw_entry.posted_at.strftime("%Y-%m-%d"),
                        project.id,
                        project.posted_at.strftime("%Y-%m-%d") if project.posted_at else "NULL",
                        delta,
                    )
                    continue

            self._matches += 1
            logger.info(
                "DedupService: Match found for entry id=%d → project id=%d (similarity=%.4f)",
                raw_entry.id,
                project.id,
                similarity,
            )
            return (project, similarity)

        logger.debug("DedupService: No match above threshold for entry id=%d", raw_entry.id)
        return None

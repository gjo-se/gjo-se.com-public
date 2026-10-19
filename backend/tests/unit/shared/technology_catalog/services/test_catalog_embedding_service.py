"""Unit tests for the catalog embedding-text builder (pure)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.shared.embedding.domain.similarity_rules import cosine_similarity
from app.shared.technology_catalog.models.technology import Technology
from app.shared.technology_catalog.services import catalog_embedding_service as svc
from app.shared.technology_catalog.services.catalog_embedding_service import (
    CatalogEmbeddingService,
    build_embedding_text,
)

pytestmark = pytest.mark.unit


def test_build_embedding_text_combines_name_type_and_description() -> None:
    """The embedding text joins the present fields in a fixed order."""
    technology = Technology(
        slug="pg",
        name="PostgreSQL",
        type="database",
        description="Relational DB",
        color_token="gray",
    )

    assert build_embedding_text(technology) == "name: PostgreSQL type: database description: Relational DB"


def test_build_embedding_text_skips_blank_fields() -> None:
    """Blank type and description are omitted from the embedding text."""
    technology = Technology(slug="pg", name="PostgreSQL", type="  ", description=None, color_token="gray")

    assert build_embedding_text(technology) == "name: PostgreSQL"


def test_build_embedding_text_without_any_field_returns_empty_string() -> None:
    """A technology without usable fields yields an empty embedding text."""
    technology = Technology(slug="pg", name="  ", type=None, description=None, color_token="gray")

    assert build_embedding_text(technology) == ""


# ── service methods (fake repository + embedding client) ─────────────────────


class _DB:
    def __init__(self) -> None:
        self.committed = 0

    async def commit(self) -> None:
        self.committed += 1


class _Ctx:
    async def __aenter__(self) -> object:
        return _DB()

    async def __aexit__(self, *_a: Any) -> bool:
        return False


def _rec(i: int, *, has_vector: bool = False, vector: list[float] | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=i, name=f"name{i}", slug=f"slug{i}", type="t", description=f"desc{i}", vector=vector, has_vector=has_vector
    )


def _patch_repo(monkeypatch: pytest.MonkeyPatch, **fns: Any) -> None:
    for name, fn in fns.items():
        monkeypatch.setattr(svc.catalog_embedding_repository, name, fn)


class _Client:
    def __init__(self, *, many: Any = None, text: Any = None) -> None:
        self._many = many
        self._text = text

    async def embed_many(self, texts: list[str], _core: Any) -> list[list[float]]:
        if self._many is None:
            return [[0.1] for _ in texts]
        return self._many(texts)

    async def embed_text(self, _text: str, _core: Any) -> list[float]:
        if self._text is None:
            return [0.9]
        return self._text()


@pytest.mark.asyncio
async def test_embed_all_returns_zero_when_all_embedded(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _records(_db: Any) -> list[Any]:
        return [_rec(1, has_vector=True)]

    _patch_repo(monkeypatch, list_all_records=_records)
    assert await CatalogEmbeddingService(_Client()).embed_all(_DB()) == 0


@pytest.mark.asyncio
async def test_embed_all_embeds_only_pending(monkeypatch: pytest.MonkeyPatch) -> None:
    stored: list[int] = []

    async def _records(_db: Any) -> list[Any]:
        return [_rec(1, has_vector=False), _rec(2, has_vector=True)]

    async def _set(_db: Any, rid: int, _v: Any) -> None:
        stored.append(rid)

    _patch_repo(monkeypatch, list_all_records=_records, open_session=_Ctx, set_vector=_set)
    assert await CatalogEmbeddingService(_Client()).embed_all(_DB()) == 1
    assert stored == [1]


@pytest.mark.asyncio
async def test_embed_incremental_none_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _pending(_db: Any, _since: Any) -> list[Any]:
        return []

    _patch_repo(monkeypatch, list_pending_records=_pending)
    assert await CatalogEmbeddingService(_Client()).embed_incremental(_DB()) == 0


@pytest.mark.asyncio
async def test_embed_incremental_embeds_pending(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _pending(_db: Any, _since: Any) -> list[Any]:
        return [_rec(1)]

    async def _set(_db: Any, _rid: int, _v: Any) -> None:
        return None

    _patch_repo(monkeypatch, list_pending_records=_pending, open_session=_Ctx, set_vector=_set)
    assert await CatalogEmbeddingService(_Client()).embed_incremental(_DB()) == 1


@pytest.mark.asyncio
async def test_embed_pending_short_batch_falls_back_to_single(monkeypatch: pytest.MonkeyPatch) -> None:
    singles: list[str] = []
    stored: list[int] = []

    async def _set(_db: Any, rid: int, _v: Any) -> None:
        stored.append(rid)

    def _single() -> list[float]:
        singles.append("x")
        return [0.5]

    async def _pending(_db: Any, _since: Any) -> list[Any]:
        return [_rec(1), _rec(2)]

    _patch_repo(monkeypatch, list_pending_records=_pending, open_session=_Ctx, set_vector=_set)
    client = _Client(many=lambda _t: [[0.1]], text=_single)  # 1 vector for 2 texts

    count = await CatalogEmbeddingService(client).embed_incremental(_DB())
    assert count == 2
    assert stored == [1, 2]
    assert len(singles) == 1


@pytest.mark.asyncio
async def test_embed_pending_batch_exception_falls_back(monkeypatch: pytest.MonkeyPatch) -> None:
    stored: list[int] = []

    async def _pending(_db: Any, _since: Any) -> list[Any]:
        return [_rec(1), _rec(2)]

    async def _set(_db: Any, rid: int, _v: Any) -> None:
        stored.append(rid)

    def _boom(_texts: list[str]) -> list[list[float]]:
        raise RuntimeError("batch down")

    _patch_repo(monkeypatch, list_pending_records=_pending, open_session=_Ctx, set_vector=_set)
    service = CatalogEmbeddingService(_Client(many=_boom, text=lambda: [1.0]))

    assert await service.embed_incremental(_DB()) == 2
    assert stored == [1, 2]


@pytest.mark.asyncio
async def test_embed_pending_single_failure_is_skipped(monkeypatch: pytest.MonkeyPatch) -> None:
    stored: list[int] = []

    async def _pending(_db: Any, _since: Any) -> list[Any]:
        return [_rec(1)]

    async def _set(_db: Any, rid: int, _v: Any) -> None:
        stored.append(rid)

    def _boom(_texts: list[str]) -> list[list[float]]:
        raise RuntimeError("batch down")

    def _single_boom() -> list[float]:
        raise RuntimeError("single down")

    _patch_repo(monkeypatch, list_pending_records=_pending, open_session=_Ctx, set_vector=_set)
    service = CatalogEmbeddingService(_Client(many=_boom, text=_single_boom))

    assert await service.embed_incremental(_DB()) == 0
    assert stored == []


@pytest.mark.asyncio
async def test_embed_pending_chunks_by_batch_size(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []

    async def _pending(_db: Any, _since: Any) -> list[Any]:
        return [_rec(i) for i in range(150)]

    async def _set(_db: Any, _rid: int, _v: Any) -> None:
        return None

    def _many(texts: list[str]) -> list[list[float]]:
        calls.append(len(texts))
        return [[0.1] for _ in texts]

    _patch_repo(monkeypatch, list_pending_records=_pending, open_session=_Ctx, set_vector=_set)
    service = CatalogEmbeddingService(_Client(many=_many))

    count = await service.embed_incremental(_DB())
    assert count == 150
    assert calls == [100, 50]


@pytest.mark.asyncio
async def test_search_similar_reports_cosine_distance_and_top_k(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _vector_records(_db: Any) -> list[Any]:
        return [_rec(1, vector=[1.0, 0.0]), _rec(2, vector=[1.0, 1.0])]

    _patch_repo(monkeypatch, open_session=_Ctx, list_vector_records=_vector_records)
    service = CatalogEmbeddingService(_Client(text=lambda: [1.0, 0.0]))

    results = await service.search_similar("q", _DB(), top_k=2)

    assert [r["technology_id"] for r in results] == [1, 2]  # sorted by similarity desc
    assert results[0]["_distance"] == round(1.0 - cosine_similarity([1.0, 0.0], [1.0, 0.0]), 6)
    # non-round distance pins the `1.0 - similarity` and `round(..., 6)` shapes
    assert results[1]["_distance"] == round(1.0 - cosine_similarity([1.0, 0.0], [1.0, 1.0]), 6)
    assert results[1]["_distance"] != round(1.0 - cosine_similarity([1.0, 0.0], [1.0, 1.0]), 5)

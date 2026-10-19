"""Unit tests for the skill-dedup embedding service (repository doubles, no DB).

The batch loop with its per-skill fallback is exercised against a doubled skill
repository and a scripted embedding-client double; the session double only
records ``flush``.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import skill_dedup_embedding_service as svc

pytestmark = pytest.mark.unit


class _DB:
    """Minimal fake DB session – the loop only ever touches ``flush``."""

    def __init__(self) -> None:
        self.flush_count = 0

    async def flush(self) -> None:
        self.flush_count += 1


def _sr(skill_id: int, name: str) -> SkillRef:
    return SkillRef(
        id=skill_id,
        name=name,
        description=None,
        importance=None,
        level=None,
        level_public=None,
        canonical_id=None,
        group_id=None,
        sort=None,
        vector=None,
    )


@pytest.mark.asyncio
async def test_compute_embeddings_returns_zero_when_nothing_to_embed(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: Any) -> list[SkillRef]:
        return []

    monkeypatch.setattr(svc.skill_repository, "get_skills_without_vector", _none)

    db = _DB()
    assert await svc.compute_embeddings(db, db, embedding_client=object()) == 0


@pytest.mark.asyncio
async def test_compute_embeddings_batch_embeds_and_flushes(monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [_sr(1, "a"), _sr(2, "b")]
    stored: list[tuple[int, list[float]]] = []

    async def _missing(_db: Any) -> list[SkillRef]:
        return skills

    async def _set_vector(_db: Any, sid: int, vector: list[float]) -> None:
        stored.append((sid, vector))

    class _Client:
        async def embed_many(self, texts: list[str], _core: Any) -> list[list[float]]:
            return [[float(i)] for i in range(len(texts))]

    monkeypatch.setattr(svc.skill_repository, "get_skills_without_vector", _missing)
    monkeypatch.setattr(svc.skill_repository, "set_vector", _set_vector)

    db = _DB()
    count = await svc.compute_embeddings(db, db, embedding_client=_Client())

    assert count == 2
    assert stored == [(1, [0.0]), (2, [1.0])]
    assert db.flush_count == 1


@pytest.mark.asyncio
async def test_compute_embeddings_falls_back_to_single_on_batch_error(monkeypatch: pytest.MonkeyPatch) -> None:
    skills = [_sr(1, "a"), _sr(2, "b")]
    stored: list[int] = []

    async def _missing(_db: Any) -> list[SkillRef]:
        return skills

    async def _set_vector(_db: Any, sid: int, _vector: list[float]) -> None:
        stored.append(sid)

    class _Client:
        async def embed_many(self, _texts: list[str], _core: Any) -> list[list[float]]:
            raise RuntimeError("batch down")

        async def embed_text(self, text: str, _core: Any) -> list[float]:
            if text == "b":
                raise RuntimeError("still down")
            return [1.0]

    monkeypatch.setattr(svc.skill_repository, "get_skills_without_vector", _missing)
    monkeypatch.setattr(svc.skill_repository, "set_vector", _set_vector)

    count = await svc.compute_embeddings(_DB(), _DB(), embedding_client=_Client())

    assert count == 1
    assert stored == [1]

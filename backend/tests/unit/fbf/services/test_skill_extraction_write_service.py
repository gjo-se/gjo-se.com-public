"""Unit tests for the skill-extraction write/link service (repository doubles, no DB).

Persisting pending skills, linking them to a master and the job-role/text-backfill
paths are exercised against doubled repositories and a commit-counting session
double; the embedding boundary is a client double.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.domain.skill_extraction_contract import ExtractedSkill, SkillExtractionResult
from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import project_service
from app.fbf.services import skill_extraction_write_service as we
from app.shared.status.repositories import status_repository, statusable_repository

pytestmark = pytest.mark.unit


class _FakeDB:
    """Session double counting commits (the write paths persist + commit)."""

    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


class _EmbeddingClient:
    """Embedding boundary double returning a fixed vector."""

    async def embed_text(self, _text: str, _core: Any) -> list[float]:
        return [0.1, 0.2]


# ── set_skill_pending ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_set_skill_pending_assigns_resolved_status(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[Any, ...]] = []

    async def _resolve(_db: Any, name: str, stype: str) -> SimpleNamespace:
        calls.append(("resolve", name, stype))
        return SimpleNamespace(id=11)

    async def _set(_db: Any, stype: str, sid: int, status_id: int) -> None:
        calls.append(("set", stype, sid, status_id))

    monkeypatch.setattr(status_repository, "get_by_name_for_type", _resolve)
    monkeypatch.setattr(statusable_repository, "set_status", _set)

    await we.set_skill_pending(_FakeDB(), 7)

    assert calls == [("resolve", "pending", "fbf_skill"), ("set", "fbf_skill", 7, 11)]


@pytest.mark.asyncio
async def test_set_skill_pending_is_noop_when_status_is_unknown(monkeypatch: pytest.MonkeyPatch) -> None:
    set_calls: list[tuple[Any, ...]] = []

    async def _resolve(_db: Any, _name: str, _stype: str) -> None:
        return None

    async def _set(*_args: Any) -> None:
        set_calls.append(_args)

    monkeypatch.setattr(status_repository, "get_by_name_for_type", _resolve)
    monkeypatch.setattr(statusable_repository, "set_status", _set)

    await we.set_skill_pending(_FakeDB(), 7)

    assert set_calls == []


# ── persist_pending_skills ───────────────────────────────────────────────────


def _patch_persist(monkeypatch: pytest.MonkeyPatch, *, cosine: SkillRef | None = None) -> dict[str, list[Any]]:
    record: dict[str, list[Any]] = {"created": [], "pending": [], "vectors": []}

    async def _mapping(_db: Any) -> dict[str, int]:
        return {}

    async def _get_by_name(_db: Any, _name: str) -> None:
        return None

    async def _create(
        _db: Any, *, name: str, importance: int | None = None, canonical_id: int | None = None
    ) -> SkillRef:
        record["created"].append((name, importance, canonical_id))
        return SkillRef(id=len(record["created"]), name=name)

    async def _set_vector(_db: Any, sid: int, vector: list[float]) -> None:
        record["vectors"].append((sid, vector))

    async def _find_cosine(_db: Any, _vector: list[float], threshold: float = 0.85) -> SkillRef | None:
        return cosine

    async def _pending(_db: Any, sid: int) -> None:
        record["pending"].append(sid)

    monkeypatch.setattr(we.tag_repository, "get_name_id_mapping", _mapping)
    monkeypatch.setattr(we.skill_repository, "get_by_name", _get_by_name)
    monkeypatch.setattr(we.skill_repository, "create", _create)
    monkeypatch.setattr(we.skill_repository, "set_vector", _set_vector)
    monkeypatch.setattr(we.skill_lookup_repository, "find_skill_by_cosine", _find_cosine)
    monkeypatch.setattr(we, "set_skill_pending", _pending)
    return record


@pytest.mark.asyncio
async def test_persist_pending_skills_creates_pending_and_stores_vector(monkeypatch: pytest.MonkeyPatch) -> None:
    record = _patch_persist(monkeypatch)
    db = _FakeDB()

    skills = [ExtractedSkill(name="Python", importance_guess=4), ExtractedSkill(name="python", importance_guess=3)]
    created = await we.persist_pending_skills(db, db, skills, _EmbeddingClient())

    assert created == 1
    assert record["created"] == [("Python", 4, None)]
    assert record["pending"] == [1]
    assert record["vectors"] == [(1, [0.1, 0.2])]
    assert db.commits == 1


@pytest.mark.asyncio
async def test_persist_pending_skills_links_cosine_match_as_slave(monkeypatch: pytest.MonkeyPatch) -> None:
    record = _patch_persist(monkeypatch, cosine=SkillRef(id=9, name="Master", canonical_id=3))

    created = await we.persist_pending_skills(
        _FakeDB(), _FakeDB(), [ExtractedSkill(name="Py", importance_guess=4)], _EmbeddingClient()
    )

    assert created == 1
    assert record["created"] == [("Py", 4, 3)]  # resolved to the cosine master


@pytest.mark.asyncio
async def test_persist_pending_skills_skips_existing_names(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _mapping(_db: Any) -> dict[str, int]:
        return {}

    async def _get_by_name(_db: Any, name: str) -> SkillRef:
        return SkillRef(id=1, name=name)

    async def _boom(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("create must not run for an existing name")

    monkeypatch.setattr(we.tag_repository, "get_name_id_mapping", _mapping)
    monkeypatch.setattr(we.skill_repository, "get_by_name", _get_by_name)
    monkeypatch.setattr(we.skill_repository, "create", _boom)

    created = await we.persist_pending_skills(
        _FakeDB(), _FakeDB(), [ExtractedSkill(name="Python", importance_guess=4)], _EmbeddingClient()
    )

    assert created == 0


# ── link_skills_to_master ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_link_skills_to_master_relinks_idempotently_and_recalculates(monkeypatch: pytest.MonkeyPatch) -> None:
    deleted: list[int] = []
    linked: list[tuple[int, int, int | None]] = []
    recalc: list[int] = []
    ids = {"Python": 1}

    async def _delete(_db: Any, pid: int) -> None:
        deleted.append(pid)

    async def _get_by_name(_db: Any, name: str) -> SkillRef | None:
        sid = ids.get(name)
        return SkillRef(id=sid, name=name) if sid is not None else None

    async def _link(_db: Any, pid: int, sid: int, importance: int | None = None) -> bool:
        linked.append((pid, sid, importance))
        return True

    async def _recalc(_db: Any, pid: int) -> None:
        recalc.append(pid)

    monkeypatch.setattr(we.project_skill_repository, "delete_by_project", _delete)
    monkeypatch.setattr(we.skill_repository, "get_by_name", _get_by_name)
    monkeypatch.setattr(we.project_skill_repository, "link", _link)
    monkeypatch.setattr(project_service, "recalculate_match_score", _recalc)

    db = _FakeDB()
    skills = [
        ExtractedSkill(name="Python", importance_guess=4),
        ExtractedSkill(name="Python", importance_guess=5),  # duplicate → skipped
        ExtractedSkill(name="Unknown", importance_guess=2),  # unknown → skipped
    ]

    assert await we.link_skills_to_master(db, 7, skills) == 1
    assert deleted == [7]
    assert linked == [(7, 1, 4)]
    assert recalc == [7]
    assert db.commits == 1


# ── apply_job_role ───────────────────────────────────────────────────────────


def _patch_job_role(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    assigned: dict[str, Any] = {}

    async def _get_or_create(_db: Any, name: str) -> SimpleNamespace:
        assigned["name"] = name
        return SimpleNamespace(id=7)

    async def _set(_db: Any, pid: int, role_id: int | None) -> None:
        assigned["project_id"] = pid
        assigned["role_id"] = role_id

    monkeypatch.setattr("app.fbf.services.job_role_service.get_or_create_by_name", _get_or_create)
    monkeypatch.setattr(we.project_repository, "set_job_role", _set)
    return assigned


@pytest.mark.asyncio
async def test_apply_job_role_without_classification_writes_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    assigned = _patch_job_role(monkeypatch)

    await we.apply_job_role(_FakeDB(), SimpleNamespace(id=1), SkillExtractionResult())

    assert assigned == {}


@pytest.mark.asyncio
async def test_apply_job_role_prefers_validated_match_over_new_suggestion(monkeypatch: pytest.MonkeyPatch) -> None:
    assigned = _patch_job_role(monkeypatch)
    db = _FakeDB()

    result = SkillExtractionResult(job_role_match="Developer", job_role_new="Hacker")
    await we.apply_job_role(db, SimpleNamespace(id=1), result)

    assert assigned == {"name": "Developer", "project_id": 1, "role_id": 7}
    assert db.commits == 1


@pytest.mark.asyncio
async def test_apply_job_role_assigns_trimmed_new_role(monkeypatch: pytest.MonkeyPatch) -> None:
    assigned = _patch_job_role(monkeypatch)
    db = _FakeDB()

    await we.apply_job_role(db, SimpleNamespace(id=1), SkillExtractionResult(job_role_new="  Platform Engineer  "))

    assert assigned == {"name": "Platform Engineer", "project_id": 1, "role_id": 7}
    assert db.commits == 1


# ── backfill_text_matches ────────────────────────────────────────────────────


def _patch_backfill(
    monkeypatch: pytest.MonkeyPatch,
    master: object,
    *,
    mapping: dict[str, int],
    existing_ids: tuple[int, ...] = (),
) -> list[int]:
    linked: list[int] = []

    async def _get_out(_db: Any, _pid: int) -> object:
        return master

    async def _mapping(_db: Any) -> dict[str, int]:
        return mapping

    async def _existing(_db: Any, _pid: int) -> list[tuple[object, ...]]:
        return [(SimpleNamespace(id=i),) for i in existing_ids]

    async def _link(_db: Any, _pid: int, skill_id: int, importance: int | None = None) -> bool:
        linked.append(skill_id)
        return True

    async def _recalc(_db: Any, _pid: int) -> None:
        return None

    monkeypatch.setattr(we.project_repository, "get_out_by_id", _get_out)
    monkeypatch.setattr(we.skill_repository, "get_name_id_mapping", _mapping)
    monkeypatch.setattr(we.skill_repository, "get_scored_skills", _existing)
    monkeypatch.setattr(we.project_skill_repository, "link", _link)
    monkeypatch.setattr(project_service, "recalculate_match_score", _recalc)
    return linked


@pytest.mark.asyncio
async def test_backfill_links_literal_text_matches(monkeypatch: pytest.MonkeyPatch) -> None:
    master = SimpleNamespace(merged_description_de="Wir nutzen Docker Compose und Python.")
    linked = _patch_backfill(monkeypatch, master, mapping={"docker": 1, "docker compose": 2, "rust": 3})
    db = _FakeDB()

    result = await we.backfill_text_matches(db, 7)

    assert result == 2
    assert sorted(linked) == [1, 2]
    assert db.commits == 1


@pytest.mark.asyncio
async def test_backfill_requires_word_boundaries(monkeypatch: pytest.MonkeyPatch) -> None:
    linked = _patch_backfill(monkeypatch, SimpleNamespace(merged_description_de="docker"), mapping={"ock": 1})

    assert await we.backfill_text_matches(_FakeDB(), 7) == 0
    assert linked == []


@pytest.mark.asyncio
async def test_backfill_skips_already_linked_skills(monkeypatch: pytest.MonkeyPatch) -> None:
    master = SimpleNamespace(merged_description_de="docker und rust")
    linked = _patch_backfill(monkeypatch, master, mapping={"docker": 1, "rust": 2}, existing_ids=(1,))

    assert await we.backfill_text_matches(_FakeDB(), 7) == 1
    assert linked == [2]


@pytest.mark.asyncio
async def test_backfill_without_master_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_backfill(monkeypatch, None, mapping={"docker": 1})

    assert await we.backfill_text_matches(_FakeDB(), 7) == 0


@pytest.mark.asyncio
async def test_backfill_without_description_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_backfill(monkeypatch, SimpleNamespace(merged_description_de=""), mapping={"docker": 1})

    assert await we.backfill_text_matches(_FakeDB(), 7) == 0


@pytest.mark.asyncio
async def test_backfill_without_skill_catalog_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_backfill(monkeypatch, SimpleNamespace(merged_description_de="docker"), mapping={})

    assert await we.backfill_text_matches(_FakeDB(), 7) == 0

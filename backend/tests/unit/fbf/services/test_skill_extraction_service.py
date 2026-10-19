"""Unit tests for the skill-extraction structured-output schemas (pure).

The Pydantic schemas constrain what the LLM may return; they are the contract
the extraction service validates against. No DB or LLM is involved.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.fbf.services import skill_extraction_service
from app.fbf.services.skill_extraction_service import (
    ExtractedSkill,
    SkillExtractionResult,
    SkillExtractionService,
    TaskExecutionError,
)

pytestmark = pytest.mark.unit


def test_extracted_skill_accepts_valid_importance() -> None:
    """A well-formed skill keeps name and importance."""
    skill = ExtractedSkill(name="Python", importance_guess=5, confidence=0.9)

    assert skill.name == "Python"
    assert skill.importance_guess == 5
    assert skill.confidence == pytest.approx(0.9)


@pytest.mark.parametrize("importance", [-1, 6])
def test_extracted_skill_rejects_out_of_range_importance(importance: int) -> None:
    """Importance outside 0–5 is rejected."""
    with pytest.raises(ValidationError):
        ExtractedSkill(name="Python", importance_guess=importance)


def test_extracted_skill_accepts_importance_alias() -> None:
    """The ``importance`` alias is accepted for the importance field."""
    skill = ExtractedSkill(name="Python", importance=4)

    assert skill.importance_guess == 4


def test_extracted_skill_rejects_empty_name() -> None:
    """An empty skill name violates the min-length constraint."""
    with pytest.raises(ValidationError):
        ExtractedSkill(name="", importance_guess=3)


def test_extracted_skill_rejects_confidence_above_one() -> None:
    """A confidence above 1.0 is rejected."""
    with pytest.raises(ValidationError):
        ExtractedSkill(name="Python", importance_guess=3, confidence=1.5)


def test_skill_extraction_result_defaults_to_empty_skill_list() -> None:
    """A result without skills defaults to an empty list and no job role."""
    result = SkillExtractionResult()

    assert result.skills == []
    assert result.job_role_match is None
    assert result.job_role_new is None


def test_task_execution_error_exposes_error_type() -> None:
    """The task error carries the standardised error type for classification."""
    error = TaskExecutionError("rate_limit")

    assert error.error_type == "rate_limit"
    assert "rate_limit" in str(error)


# ── _normalize_role (pure) ───────────────────────────────────────────────────


def test_normalize_role_keeps_exact_known_match() -> None:
    """An exact known role is kept as ``job_role_match``."""
    result = SkillExtractionResult(job_role_match="Developer")

    out = SkillExtractionService._normalize_role(result, ["Developer", "Ops"])

    assert out.job_role_match == "Developer"
    assert out.job_role_new is None


def test_normalize_role_strips_known_match() -> None:
    """Surrounding whitespace is stripped before the known-role check."""
    result = SkillExtractionResult(job_role_match="  Developer  ")

    out = SkillExtractionService._normalize_role(result, ["Developer"])

    assert out.job_role_match == "Developer"


def test_normalize_role_demotes_unknown_match() -> None:
    """An unknown match is demoted to a new-role suggestion."""
    result = SkillExtractionResult(job_role_match="Hacker")

    out = SkillExtractionService._normalize_role(result, ["Developer"])

    assert out.job_role_match is None
    assert out.job_role_new == "Hacker"


def test_normalize_role_without_match_stays_none() -> None:
    """No match leaves both role fields unset."""
    out = SkillExtractionService._normalize_role(SkillExtractionResult(), ["Developer"])

    assert out.job_role_match is None
    assert out.job_role_new is None


# ── test_run: master eligibility via the public entry point ──────────────────


def _patch_project_lookup(monkeypatch: pytest.MonkeyPatch, master: object) -> None:
    """Make the project repository return *master* for any id."""

    async def _get(_db: object, _pid: int) -> object:
        return master

    monkeypatch.setattr("app.fbf.repositories.project_repository.get_out_by_id", _get)


async def test_test_run_missing_project_raises_value_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing project aborts the run with ValueError."""
    _patch_project_lookup(monkeypatch, None)

    with pytest.raises(ValueError):
        await SkillExtractionService(None).test_run(None, None, 1)


async def test_test_run_skips_slave_project(monkeypatch: pytest.MonkeyPatch) -> None:
    """A slave project (canonical_id set) is skipped without extracting."""
    _patch_project_lookup(monkeypatch, SimpleNamespace(canonical_id=9, merged_description_de="x"))

    assert await SkillExtractionService(None).test_run(None, None, 1) == []


async def test_test_run_skips_master_without_description(monkeypatch: pytest.MonkeyPatch) -> None:
    """A master without a merged description is skipped without extracting."""
    _patch_project_lookup(monkeypatch, SimpleNamespace(canonical_id=None, merged_description_de=None))

    assert await SkillExtractionService(None).test_run(None, None, 1) == []


async def test_test_run_returns_extracted_skills_for_eligible_master(monkeypatch: pytest.MonkeyPatch) -> None:
    """An eligible master is extracted and its skills are returned (dry-run)."""
    master = SimpleNamespace(canonical_id=None, merged_description_de="desc")
    _patch_project_lookup(monkeypatch, master)
    _patch_catalogs(monkeypatch, ["Developer"], ["Python"])

    class _Executor:
        async def execute_task(self, **_kwargs: object) -> dict[str, object]:
            return {
                "success": True,
                "result": SkillExtractionResult(skills=[ExtractedSkill(name="Python", importance_guess=5)]),
            }

    monkeypatch.setattr(skill_extraction_service, "get_task_executor_service", _Executor)

    skills = await SkillExtractionService(None).test_run(None, None, 1)

    assert [s.name for s in skills] == ["Python"]


# ── _extract (executor + catalog doubles) ────────────────────────────────────


def _patch_catalogs(monkeypatch: pytest.MonkeyPatch, roles: list[str], skills: list[str]) -> None:
    """Patch the confirmed-role and confirmed-skill catalog lookups."""

    async def _roles(_db: object) -> list[str]:
        return roles

    async def _skills(_db: object) -> list[str]:
        return skills

    monkeypatch.setattr("app.fbf.services.job_role_service.list_confirmed_names", _roles)
    monkeypatch.setattr("app.fbf.services.skill_service.list_confirmed_names", _skills)


async def test_extract_builds_variables_and_normalizes_role(monkeypatch: pytest.MonkeyPatch) -> None:
    """The prompt variables are built from the catalogs and the role is normalized."""
    _patch_catalogs(monkeypatch, ["Developer", "Ops"], ["Python"])
    captured: dict[str, object] = {}

    class _Executor:
        async def execute_task(self, **kwargs: object) -> dict[str, object]:
            captured.update(kwargs)
            return {
                "success": True,
                "result": SkillExtractionResult(
                    skills=[ExtractedSkill(name="Python", importance_guess=5)], job_role_match="Developer"
                ),
            }

    monkeypatch.setattr(skill_extraction_service, "get_task_executor_service", _Executor)

    out = await SkillExtractionService(None)._extract(None, None, "desc", project_id=1, trigger="pipeline")

    variables = captured["variables"]
    assert captured["task_key"] == "skill-extraction"
    assert variables["known_job_roles"] == "Developer, Ops"  # type: ignore[index]
    assert variables["known_skills"] == "Python"  # type: ignore[index]
    assert variables["available_tags"]  # type: ignore[index]
    assert out.job_role_match == "Developer"


async def test_extract_uses_placeholder_for_empty_catalogs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Empty catalogs render as the ``(keine)`` placeholder."""
    _patch_catalogs(monkeypatch, [], [])
    captured: dict[str, object] = {}

    class _Executor:
        async def execute_task(self, **kwargs: object) -> dict[str, object]:
            captured.update(kwargs)
            return {"success": True, "result": SkillExtractionResult()}

    monkeypatch.setattr(skill_extraction_service, "get_task_executor_service", _Executor)

    await SkillExtractionService(None)._extract(None, None, "desc")

    assert captured["variables"]["known_job_roles"] == "(keine)"  # type: ignore[index]
    assert captured["variables"]["known_skills"] == "(keine)"  # type: ignore[index]


async def test_extract_raises_task_execution_error_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """A failed executor result raises TaskExecutionError with the error type."""
    _patch_catalogs(monkeypatch, [], [])

    class _Executor:
        async def execute_task(self, **_kwargs: object) -> dict[str, object]:
            return {"success": False, "error_type": "rate_limit"}

    monkeypatch.setattr(skill_extraction_service, "get_task_executor_service", _Executor)

    with pytest.raises(TaskExecutionError) as exc_info:
        await SkillExtractionService(None)._extract(None, None, "desc")

    assert exc_info.value.error_type == "rate_limit"


# ── _apply_job_role (job-role service double) ────────────────────────────────


async def test_apply_job_role_without_classification_leaves_id_unset(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without a match/new role the project's job role is not written."""
    written: list[object] = []

    async def _set_job_role(_db: object, _pid: int, _role_id: int | None) -> None:
        written.append((_pid, _role_id))

    monkeypatch.setattr("app.fbf.repositories.project_repository.set_job_role", _set_job_role)

    master = SimpleNamespace(id=99)

    await SkillExtractionService._apply_job_role(None, master, SkillExtractionResult())

    assert written == []


async def test_apply_job_role_assigns_created_role(monkeypatch: pytest.MonkeyPatch) -> None:
    """A classified role is created/assigned via the repository and committed."""
    assigned: dict[str, object] = {}

    async def _get_or_create(_db: object, name: str) -> object:
        assigned["name"] = name
        return SimpleNamespace(id=7)

    async def _set_job_role(_db: object, project_id: int, role_id: int | None) -> None:
        assigned["project_id"] = project_id
        assigned["role_id"] = role_id

    class _DB:
        async def commit(self) -> None:
            assigned["committed"] = True

    monkeypatch.setattr("app.fbf.services.job_role_service.get_or_create_by_name", _get_or_create)
    monkeypatch.setattr("app.fbf.repositories.project_repository.set_job_role", _set_job_role)

    master = SimpleNamespace(id=1)

    await SkillExtractionService._apply_job_role(_DB(), master, SkillExtractionResult(job_role_match="Developer"))

    assert assigned == {"name": "Developer", "project_id": 1, "role_id": 7, "committed": True}


# ── backfill_text_matches (substring linking, no DB) ─────────────────────────


class _FakeGjoDB:
    """Session double counting commits (the master lookup is patched separately)."""

    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


def _patch_backfill(
    monkeypatch: pytest.MonkeyPatch,
    master: object,
    *,
    mapping: dict[str, int],
    existing_ids: tuple[int, ...] = (),
) -> list[int]:
    """Wire the repos/project-service doubles and return the recorded link calls."""
    from app.fbf.repositories import project_repository, project_skill_repository, skill_repository
    from app.fbf.services import project_service

    linked: list[int] = []

    async def _get_out(_db: object, _pid: int) -> object:
        return master

    async def _mapping(_db: object) -> dict[str, int]:
        return mapping

    async def _existing(_db: object, _pid: int) -> list[tuple[object, ...]]:
        return [(SimpleNamespace(id=i),) for i in existing_ids]

    async def _link(_db: object, _pid: int, skill_id: int, importance: object = None) -> bool:
        del importance
        linked.append(skill_id)
        return True

    async def _recalc(_db: object, _pid: int) -> None:
        return None

    monkeypatch.setattr(project_repository, "get_out_by_id", _get_out)
    monkeypatch.setattr(skill_repository, "get_name_id_mapping", _mapping)
    monkeypatch.setattr(skill_repository, "get_scored_skills", _existing)
    monkeypatch.setattr(project_skill_repository, "link", _link)
    monkeypatch.setattr(project_service, "recalculate_match_score", _recalc)
    return linked


async def test_backfill_links_literal_text_matches(monkeypatch: pytest.MonkeyPatch) -> None:
    """Skill names appearing literally in the description are linked."""
    master = SimpleNamespace(merged_description_de="Wir nutzen Docker Compose und Python.")
    linked = _patch_backfill(monkeypatch, master, mapping={"docker": 1, "docker compose": 2, "rust": 3})
    db = _FakeGjoDB()

    result = await SkillExtractionService.backfill_text_matches(db, 7)

    assert result == 2
    assert sorted(linked) == [1, 2]
    assert db.commits == 1


async def test_backfill_requires_word_boundaries(monkeypatch: pytest.MonkeyPatch) -> None:
    """A substring inside a larger word does not match (word boundaries)."""
    master = SimpleNamespace(merged_description_de="docker")
    linked = _patch_backfill(monkeypatch, master, mapping={"ock": 1})
    db = _FakeGjoDB()

    assert await SkillExtractionService.backfill_text_matches(db, 7) == 0
    assert linked == []


async def test_backfill_skips_already_linked_skills(monkeypatch: pytest.MonkeyPatch) -> None:
    """Skills already linked to the project are not linked again."""
    master = SimpleNamespace(merged_description_de="docker und rust")
    linked = _patch_backfill(monkeypatch, master, mapping={"docker": 1, "rust": 2}, existing_ids=(1,))
    db = _FakeGjoDB()

    assert await SkillExtractionService.backfill_text_matches(db, 7) == 1
    assert linked == [2]


async def test_backfill_without_master_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing master project yields no links."""
    _patch_backfill(monkeypatch, None, mapping={"docker": 1})
    db = _FakeGjoDB()

    assert await SkillExtractionService.backfill_text_matches(db, 7) == 0


async def test_backfill_without_description_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    """A master without a description is skipped."""
    _patch_backfill(monkeypatch, SimpleNamespace(merged_description_de=""), mapping={"docker": 1})
    db = _FakeGjoDB()

    assert await SkillExtractionService.backfill_text_matches(db, 7) == 0


async def test_backfill_without_skill_catalog_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without any known skill names nothing can match."""
    master = SimpleNamespace(merged_description_de="docker")
    _patch_backfill(monkeypatch, master, mapping={})
    db = _FakeGjoDB()

    assert await SkillExtractionService.backfill_text_matches(db, 7) == 0

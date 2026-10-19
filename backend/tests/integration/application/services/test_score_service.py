"""Integration tests for the content-scoring orchestration (public interface).

The score service is DB/LLM-coupled (integration level). ``run_content_scoring``
is exercised through its public contract with the LLM executor and the sample
session replaced by fakes: the self-consistency median merge, the canon mapping,
the requirement normalisation and the all-samples-failed error path.
"""

from __future__ import annotations

from contextlib import AbstractAsyncContextManager
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.domain.application_score_rubric_rules import (
    CONTENT_CRITERIA_KEYS,
)
from app.application.exceptions import ApplicationScoreLLMError
from app.application.schemas.score_schemas import RequirementOut
from app.application.services import score_service

pytestmark = pytest.mark.integration

#: Deterministic per-seed must_skills values (seeds 42/43/44 → median 0.5).
_VALUES_BY_SEED: dict[int, float] = {42: 0.2, 43: 0.8, 44: 0.5}


class _SessionScope(AbstractAsyncContextManager[AsyncSession]):
    """Async context manager yielding no real session (the fake ignores it)."""

    async def __aenter__(self) -> AsyncSession:
        """Yield a dummy session placeholder."""
        return None  # type: ignore[return-value]

    async def __aexit__(self, *exc: object) -> bool:
        """Do not suppress exceptions."""
        return False


class _FakeTaskExecutor:
    """Returns deterministic sample results keyed by the sample seed."""

    def __init__(self, *, success: bool = True) -> None:
        """Configure whether samples succeed or fail."""
        self._success = success
        self.calls = 0

    async def execute_task(self, **kwargs: Any) -> dict[str, Any]:
        """Return a per-seed sample result (or a failure)."""
        self.calls += 1
        if not self._success:
            return {"success": False, "error_type": "rate_limit"}
        seed = kwargs["hyperparameters"]["seed"]
        value = _VALUES_BY_SEED[seed]
        return {
            "success": True,
            "call_log_id": 42,
            "result": score_service.ApplicationScoreLLMResult(
                criteria=[score_service.CriterionEvaluation(key="must_skills", value=value, reason=f"seed-{seed}")],
                requirements=[RequirementOut(text="Python-Erfahrung", kind="must")],
            ),
        }


def _session_scope() -> _SessionScope:
    """Return a fresh fake sample-session scope."""
    return _SessionScope()


def _patch_executor(monkeypatch: pytest.MonkeyPatch, executor: _FakeTaskExecutor) -> None:
    """Replace the sample session and the central task executor with fakes."""
    monkeypatch.setattr(score_service.score_run_repository, "open_sample_session", _session_scope)
    monkeypatch.setattr(score_service, "get_task_executor_service", lambda: executor)


async def test_run_content_scoring_merges_samples_via_median_and_maps_canon(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Three samples are mediated per criterion and mapped to the content canon."""
    executor = _FakeTaskExecutor()
    _patch_executor(monkeypatch, executor)

    result = await score_service.run_content_scoring(
        ausschreibung="Ausschreibung", paket="Paket", run_id=1, project_id=1
    )

    assert executor.calls == score_service._LLM_SAMPLE_COUNT
    assert [score.key for score in result.criteria] == list(CONTENT_CRITERIA_KEYS)
    must_skills = next(score for score in result.criteria if score.key == "must_skills")
    assert must_skills.value == pytest.approx(0.5)
    assert must_skills.reason == "seed-44"
    assert result.llm_call_log_id == 42
    assert [requirement.text for requirement in result.requirements] == ["Python-Erfahrung"]


async def test_run_content_scoring_raises_when_every_sample_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If every sample fails, the error type is propagated."""
    _patch_executor(monkeypatch, _FakeTaskExecutor(success=False))

    with pytest.raises(ApplicationScoreLLMError) as exc:
        await score_service.run_content_scoring(ausschreibung="Ausschreibung", paket="Paket", run_id=1, project_id=1)

    assert exc.value.error_type == "rate_limit"

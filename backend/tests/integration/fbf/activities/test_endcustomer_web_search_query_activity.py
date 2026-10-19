"""Integration tests for the ``endcustomer_web_search_query`` activity (Act 3).

The parallel Brave/Tavily searches reach the deterministic ``mock_external_http``
routes and the company-name extraction is answered by the ``llm_double`` – no
real network or LLM call. The deduplicated results are persisted as candidates
in the real container database.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_web_search_query_activity
from app.fbf.models.project import Project
from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repository
from tests.llm_double import LlmDouble

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("mock_external_http")]

_COMPANY_NAMES = "Beispielkunde GmbH\nMusterfirma AG\nDritte Firma KG"


async def test_run_searches_and_persists_stubbed_candidates(
    db_session: AsyncSession,
    llm_double: LlmDouble,
) -> None:
    """Queries are searched through the stubs and every deduplicated hit becomes a candidate."""
    project = Project(
        url="https://example.test/projects/web-search",
        title="Cloud Plattform",
        city="Berlin",
        industry="Cloud",
    )
    db_session.add(project)
    await db_session.commit()
    project_id = project.id
    llm_double.set_response("endcustomer-company-name", _COMPANY_NAMES)

    result = await endcustomer_web_search_query_activity.run(
        MagicMock(),
        {
            "project_id": project_id,
            "signals": {
                "company_hints": ["Acme"],
                "product_hints": ["Kubernetes"],
                "tech_stack_summary": "Python",
            },
        },
    )

    db_session.expire_all()
    stored = await candidate_repository.get_by_project(db_session, project_id)
    assert result["project_id"] == project_id
    assert result["candidates_count"] == len(stored) == 3
    assert {candidate.company_name for candidate in stored} == {
        "Beispielkunde GmbH",
        "Musterfirma AG",
        "Dritte Firma KG",
    }
    assert {candidate.source for candidate in stored} == {"brave", "tavily"}
    assert {candidate.website for candidate in stored} == {"https://example-kunde.de", "https://musterfirma.de"}
    assert llm_double.task_keys == ["endcustomer-company-name"]


async def test_run_unknown_project_raises(db_session: AsyncSession) -> None:
    """A missing project fails fast with a ``ValueError`` before any search."""
    with pytest.raises(ValueError, match="not found"):
        await endcustomer_web_search_query_activity.run(MagicMock(), {"project_id": 999_999})

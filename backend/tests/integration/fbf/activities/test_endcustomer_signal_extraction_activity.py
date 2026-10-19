"""Integration tests for the ``endcustomer_signal_extraction`` activity (Act 2).

The structured extraction is answered by the ``llm_double`` (no provider/LangFuse
call). The master + slave descriptions are loaded from the real container
database and forwarded to the task.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_signal_extraction_activity
from app.fbf.models.project import Project
from tests.llm_double import LlmDouble

pytestmark = pytest.mark.integration


async def test_run_extracts_signals_from_master_and_slave_descriptions(
    db_session: AsyncSession,
    llm_double: LlmDouble,
) -> None:
    """The task receives master + slave text and its structured result is passed through."""
    master = Project(
        url="https://example.test/projects/signal-master",
        title="Master Projekt",
        description="Master Beschreibung mit Firmenhinweis.",
        city="Berlin",
        industry="Cloud",
    )
    db_session.add(master)
    await db_session.flush()
    slave = Project(
        url="https://example.test/projects/signal-slave",
        title="Slave Projekt",
        description="Slave Beschreibung mit Produkthinweis.",
        canonical_id=master.id,
    )
    db_session.add(slave)
    await db_session.commit()

    llm_double.set_response(
        "endcustomer-extraction",
        {
            "company_hints": ["Beispielkunde"],
            "product_hints": ["Kubernetes"],
            "unique_phrases": ["regulatorische Anforderung"],
            "tech_stack_summary": "Python",
            "project_context": "Cloud in Berlin",
        },
    )

    result = await endcustomer_signal_extraction_activity.run(
        MagicMock(), {"project_id": master.id, "trigger": "pipeline"}
    )

    assert result["project_id"] == master.id
    assert result["signals"] == {
        "company_hints": ["Beispielkunde"],
        "product_hints": ["Kubernetes"],
        "unique_phrases": ["regulatorische Anforderung"],
        "tech_stack_summary": "Python",
        "project_context": "Cloud in Berlin",
    }
    assert llm_double.task_keys == ["endcustomer-extraction"]
    sent_variables = llm_double.calls[0]["variables"]
    assert "Master Beschreibung" in sent_variables["description"]
    assert "Slave Beschreibung" in sent_variables["description"]


async def test_run_unknown_project_raises(db_session: AsyncSession) -> None:
    """A missing master project fails fast with a ``ValueError`` before the LLM call."""
    with pytest.raises(ValueError, match="not found"):
        await endcustomer_signal_extraction_activity.run(MagicMock(), {"project_id": 999_999})

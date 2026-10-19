"""Integration tests for the ``endcustomer_start`` activity (Act 1).

The activity stamps ``project.endcustomer_researched_at`` with the current UTC
time. The run is executed against the real container database; the clock is
frozen via the ``frozen_time`` fixture so the persisted timestamp is
deterministic.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_start_activity
from app.fbf.models.project import Project
from app.fbf.repositories import project_repository

pytestmark = pytest.mark.integration

_FROZEN_NOW = datetime(2026, 1, 1, tzinfo=UTC)


async def test_run_stamps_researched_timestamp_when_project_exists(
    db_session: AsyncSession,
    frozen_time,
) -> None:
    """A start run persists ``endcustomer_researched_at`` as the frozen now."""
    project = Project(url="https://example.test/projects/start", title="Start")
    db_session.add(project)
    await db_session.flush()
    project_id = project.id
    await db_session.commit()

    with frozen_time(_FROZEN_NOW):
        result = await endcustomer_start_activity.run(MagicMock(), {"project_id": project_id})

    assert result == {"project_id": project_id, "started_at": _FROZEN_NOW.isoformat()}

    db_session.expire_all()
    stored = await project_repository.get_by_id(db_session, project_id)
    assert stored is not None
    assert stored.endcustomer_researched_at == _FROZEN_NOW


async def test_run_raises_when_project_missing(db_session: AsyncSession) -> None:
    """Starting a run for an unknown project surfaces a ValueError."""
    with pytest.raises(ValueError, match="999999"):
        await endcustomer_start_activity.run(MagicMock(), {"project_id": 999999})

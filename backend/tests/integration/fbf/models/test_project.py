"""Integrationstests fuer Project ORM-Model."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_project_unique_url_raises_integrity_error(
    gjo_se_db_session: AsyncSession,
) -> None:
    """Doppelte url → IntegrityError."""
    project1 = Project(
        url="https://shared-url.example.com/project",
        title="Project One",
    )
    gjo_se_db_session.add(project1)
    await gjo_se_db_session.commit()

    project2 = Project(
        url="https://shared-url.example.com/project",
        title="Project Two",
    )
    gjo_se_db_session.add(project2)
    with pytest.raises(IntegrityError):
        await gjo_se_db_session.commit()

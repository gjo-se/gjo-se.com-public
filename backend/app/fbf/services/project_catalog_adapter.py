"""fbf adapter for the shared project-catalog port (import-linter Group F).

Implements :class:`app.shared.ports.project.ProjectCatalogPort` for the consuming
contexts (application, crm). The adapter is a thin, stateless facade: it holds no
state and delegates to the fbf project repositories. Wired at the composition
root (``app/main.py``).
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import override

from app.fbf.repositories import project_freelancer_map_repository, project_repository
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.project import (
    ProjectCatalogPort,
    ProjectContactFacts,
    ProjectRef,
    ProjectTitle,
    ProjectTitleSelect,
)


class ProjectCatalogAdapter(ProjectCatalogPort):
    """Project read/status operations for the consuming contexts (application, crm)."""

    @override
    async def get_project(self, db: AsyncSession, project_id: int) -> ProjectRef | None:
        """Return the project facts for ``project_id`` or ``None``."""
        project = await project_repository.get_out_by_id(db, project_id)
        if project is None:
            return None
        return ProjectRef(
            id=project.id,
            title=project.title,
            title_normalized=project.title_normalized,
            url=project.url,
            description=project.description,
            remote_percent=project.remote_percent,
            contract_type=project.contract_type,
            start_date=project.start_date,
            my_start_date=project.my_start_date,
            hourly_rate=project.hourly_rate,
            my_hourly_rate=project.my_hourly_rate,
            country=project.country,
            canonical_id=project.canonical_id,
        )

    @override
    async def get_contact_facts(self, db: AsyncSession, project_id: int) -> ProjectContactFacts | None:
        """Return the contact-enrichment facts for ``project_id`` or ``None``."""
        project = await project_repository.get_out_by_id(db, project_id)
        if project is None:
            return None
        return ProjectContactFacts(
            company_name=project.company_name,
            contact_name=project.contact_name,
            endcustomer=project.endcustomer,
        )

    @override
    async def get_titles(self, db: AsyncSession, project_ids: Sequence[int]) -> dict[int, ProjectTitle]:
        """Return a ``project_id -> title`` projection for the given ids."""
        titles = await project_repository.get_titles(db, list(project_ids))
        return {
            project_id: ProjectTitle(title=title, title_normalized=title_normalized)
            for project_id, (title, title_normalized) in titles.items()
        }

    @override
    async def get_freelancermap_external_id(self, db: AsyncSession, url: str) -> str | None:
        """Return the raw freelancermap external id matched by ``url``, or ``None``."""
        entry = await project_freelancer_map_repository.get_by_url(db, url)
        return entry.external_id if entry is not None else None

    @override
    async def set_status(self, db: AsyncSession, project_id: int, status: str) -> None:
        """Set the exclusive project status via ``core_statusable``."""
        _ = await project_repository.set_status(db, project_id, status)

    @override
    def project_title_select(self) -> ProjectTitleSelect:
        """Return a ``(project_id, title, title_normalized)`` selectable."""
        return project_repository.project_title_select()

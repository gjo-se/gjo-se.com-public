"""fbf adapter for the shared skill-catalog port (import-linter Group F).

Implements :class:`app.shared.ports.skill.SkillCatalogPort` for the application
context. The adapter is a thin, stateless facade: it holds no state and delegates
to the fbf skill services and repositories. Wired at the composition root
(``app/main.py``).
"""

from __future__ import annotations

from typing import override

from app.fbf.repositories import skill_repository
from app.fbf.services import cv_skill_service, skill_group_service, skill_public_service, skill_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.ports.skill import (
    CvSkillLink,
    PublicSkillRef,
    SkillBlend,
    SkillCatalogPort,
    SkillGroupRef,
)


class SkillCatalogAdapter(SkillCatalogPort):
    """Skill read/write operations for the application context."""

    @override
    async def get_cv_skill_links(self, db: AsyncSession, project_id: int) -> list[CvSkillLink]:
        """Return the project's CV skill links (original name + master group)."""
        rows = await skill_repository.get_cv_skill_rows(db, project_id)
        return [
            CvSkillLink(
                skill_id=row.skill_id,
                original_name=row.original_name,
                level_public=row.level_public,
                group_id=row.group_id,
                group_sort=row.group_sort,
                group_label=row.group_label,
            )
            for row in rows
        ]

    @override
    async def get_project_public_skills(self, db: AsyncSession, project_id: int) -> list[SkillBlend] | None:
        """Return the project's public skills with blended importance."""
        rows = await skill_public_service.get_project_public_skills(db, project_id)
        if rows is None:
            return None
        return [
            SkillBlend(
                skill_id=skill.id,
                name=skill.name,
                level_public=skill.level_public,
                group_id=skill.group_id,
                sort=skill.sort,
                importance=skill_service.effective_importance(skill, project_importance, avg_importance),
            )
            for skill, project_importance, avg_importance in rows
        ]

    @override
    async def list_public_skills(
        self,
        db: AsyncSession,
        *,
        group_id: int | None = None,
        limit: int | None = None,
        tag: str = "site:public",
        grouped_only: bool = False,
    ) -> list[SkillBlend]:
        """Return tagged public skills with blended importance."""
        rows = await skill_public_service.list_public_skills(
            db,
            group_id=group_id,
            limit=limit,
            tag=tag,
            grouped_only=grouped_only,
        )
        return [
            SkillBlend(
                skill_id=skill.id,
                name=skill.name,
                level_public=skill.level_public,
                group_id=skill.group_id,
                sort=skill.sort,
                importance=skill_service.effective_importance(skill, None, avg_importance),
            )
            for skill, avg_importance in rows
        ]

    @override
    async def list_public_groups(self, db: AsyncSession, locale: str) -> list[SkillGroupRef]:
        """Return the curated public groups (``sort`` ASC) with localized labels."""
        groups = await skill_group_service.list_public_groups(db, locale)
        return [SkillGroupRef(id=group.id, label=group.label) for group in groups]

    @override
    async def list_public_profile_skills(self, db: AsyncSession) -> list[PublicSkillRef]:
        """Return public profile skills (``level_public > 0``, ``active``) by name."""
        skills = await skill_repository.get_public_profile_skills(db)
        return [PublicSkillRef(id=skill.id, name=skill.name, level_public=skill.level_public) for skill in skills]

    @override
    async def add_project_skills(
        self,
        db: AsyncSession,
        *,
        project_id: int,
        names: list[str],
        core_db: AsyncSession,
        embedding_client: EmbeddingClient,
    ) -> None:
        """Ensure the named skills, link them to the project (idempotent)."""
        await cv_skill_service.add_project_skills(
            db,
            project_id=project_id,
            names=names,
            core_db=core_db,
            embedding_client=embedding_client,
        )

    @override
    async def exclude_project_skill(self, db: AsyncSession, *, name: str) -> None:
        """Detach, reject and unassign the skill with ``name``."""
        await cv_skill_service.exclude_project_skill(db, name=name)

"""Add/remove application CV skills via the FBF pipeline (gjo_se_com).

Batch entry points behind the admin endpoints. The fbf-owned skill pipeline
(ensure a real ``fbf_skill`` row, attach it to its most probable grouped master
via the dedup pipeline, link it in the single ``project_skill`` junction) lives
in ``app.fbf`` and is reached through the shared ``SkillCatalogPort`` – the
application context only orchestrates the CV re-render. No direct
``app.fbf`` import (import-linter Achse 1, Group F).

Skill semantics (SOLL):
- Only **slaves** are produced here – a master is never created.
- The skill is never given a group; only masters hang on a group, every slave
  hangs on its master via ``canonical_id``.
- Group / level_public / importance are **inherited from the master**.
- A newly created skill gets an **embedding** and is flagged ``active``.
- The CV displays the **verbatim slave name**.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import structlog

from app.application.services import cv_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.ports.project import ProjectCatalogPort
from app.shared.ports.skill import SkillCatalogPort

if TYPE_CHECKING:
    from app.application.schemas.document_schemas import CvSkillAddItemIn, DocumentOut
    from app.application.schemas.submission_schemas import SubmissionDetailOut

logger = structlog.get_logger(__name__)


async def add_cv_skills(
    db: AsyncSession,
    *,
    submission: SubmissionDetailOut,
    items: list[CvSkillAddItemIn],
    core_db: AsyncSession,
    embedding_client: EmbeddingClient,
    catalog: ProjectCatalogPort,
    skills: SkillCatalogPort,
) -> DocumentOut:
    """Ensures the requested skills, links them and re-renders the CV once.

    The skill resolution/creation/dedup and the project link are delegated to the
    fbf-owned ``SkillCatalogPort``; the CV is then re-rendered **once** (old
    snapshot replaced) and the transaction committed.

    Args:
        db: Active gjo_se_com DB session.
        submission: Persisted submission whose CV is regenerated.
        items: Requested skills (name only).
        core_db: Core DB session used for the embedding credential lookup.
        embedding_client: Embedding client for newly created skills.
        catalog: Project-catalog port (fbf-owned project facts).
        skills: Skill-catalog port (fbf-owned skill operations).

    Returns:
        The newly created :class:`Document` (the fresh CV snapshot).
    """
    await skills.add_project_skills(
        db,
        project_id=submission.project_id,
        names=[item.name for item in items],
        core_db=core_db,
        embedding_client=embedding_client,
    )
    document = await cv_service.regenerate_cv_document(db, submission=submission, catalog=catalog, skills=skills)
    await db.commit()
    logger.info(
        "application_cv_skill: added skills and re-rendered CV once",
        submission_id=submission.id,
        project_id=submission.project_id,
        skill_count=len(items),
    )
    return document


async def exclude_cv_skill(
    db: AsyncSession,
    *,
    submission: SubmissionDetailOut,
    name: str,
    catalog: ProjectCatalogPort,
    skills: SkillCatalogPort,
) -> DocumentOut:
    """Detaches one skill from its master, rejects it and re-renders once.

    The detach/reject is delegated to the fbf-owned ``SkillCatalogPort``. The
    submission's CV is then re-rendered **once** (old snapshot replaced).

    Args:
        db: Active gjo_se_com DB session.
        submission: Persisted submission whose CV is regenerated.
        name: Exact ``fbf_skill.name`` to exclude.
        catalog: Project-catalog port (fbf-owned project facts).
        skills: Skill-catalog port (fbf-owned skill operations).

    Returns:
        The freshly rendered :class:`Document`.

    Raises:
        ValueError: If no skill with the given name exists.
    """
    await skills.exclude_project_skill(db, name=name.strip())
    document = await cv_service.regenerate_cv_document(db, submission=submission, catalog=catalog, skills=skills)
    await db.commit()
    logger.info(
        "application_cv_skill: excluded skill and re-rendered CV once",
        submission_id=submission.id,
        project_id=submission.project_id,
    )
    return document

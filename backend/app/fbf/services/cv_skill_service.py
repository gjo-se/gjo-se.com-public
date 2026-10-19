"""CV skill management on the fbf side (import-linter Group F).

The application context used to own the CV-skill add/remove pipeline even though
it operates purely on fbf skill entities, its dedup pipeline and the
``project_skill`` junction. That logic belongs to the owning context and now
lives here; the application side only orchestrates the CV re-render and reaches
this service through the shared ``SkillCatalogPort``.
"""

from __future__ import annotations

import structlog

from app.fbf.repositories import project_skill_repository, skill_repository
from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import skill_dedup_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.status.repositories import status_repository, statusable_repository

logger = structlog.get_logger(__name__)

#: Status a manually excluded skill is set to (never renders – master gate).
_REJECTED_STATUS = "rejected"
#: Polymorphic ``statusable_type`` used for FBF skills.
_SKILL_STATUSABLE_TYPE = "fbf_skill"
#: Name of the status that marks a skill as renderable.
_ACTIVE_STATUS = "active"


async def _set_skill_active(db: AsyncSession, skill_id: int) -> None:
    """Flags the skill ``active`` via ``core_statusable``.

    Mirrors :func:`skill_service.confirm_skills` – only rewrites the junction row
    when the current status is not already ``active``.
    """
    active_status = await status_repository.get_by_name_for_type(db, _ACTIVE_STATUS, _SKILL_STATUSABLE_TYPE)
    if active_status is None:
        logger.warning("fbf_cv_skill: '%s' status missing for fbf_skill", _ACTIVE_STATUS)
        return
    current = await statusable_repository.get_status(db, _SKILL_STATUSABLE_TYPE, skill_id)
    if current is None or current.status.name != _ACTIVE_STATUS:
        await statusable_repository.set_status(db, _SKILL_STATUSABLE_TYPE, skill_id, active_status.id)


def _dedupe_by_name(names: list[str]) -> list[str]:
    """Collapses duplicate skill names, keeping the first occurrence."""
    seen: set[str] = set()
    unique: list[str] = []
    for name in names:
        if name in seen:
            continue
        seen.add(name)
        unique.append(name)
    return unique


async def _effective_master(db: AsyncSession, skill: SkillRef) -> SkillRef | None:
    """Return the master a skill resolves to (itself when it is a master)."""
    master_id = skill.canonical_id if skill.canonical_id is not None else skill.id
    return await skill_repository.get_by_id(db, master_id)


async def _attach_to_best_grouped_master(db: AsyncSession, *, skill: SkillRef) -> None:
    """Attach ``skill`` to its most similar **grouped** master when needed.

    No-op when the skill already resolves to a grouped master. A skill that
    resolves to an *ungrouped* master (or is an ungrouped master itself) would
    never render, so it is attached to the best grouped master via the defined
    dedup pipeline. A skill that is itself a master **with slaves** is never
    converted – it is logged and left for manual curation.
    """
    master = await _effective_master(db, skill)
    if master is not None and master.group_id is not None:
        return
    if skill.vector is None:
        logger.info("fbf_cv_skill: '%s' has no embedding – cannot attach", skill.name)
        return
    if await skill_repository.count_slaves(db, skill.id) > 0:
        logger.warning(
            "fbf_cv_skill: '%s' is an ungrouped master with slaves – left for manual curation",
            skill.name,
        )
        return
    try:
        suggestions = await skill_dedup_service.get_suggestions(db, skill.id, require_group=True)
    except Exception:
        logger.exception("fbf_cv_skill: dedup suggestions failed for skill id=%d", skill.id)
        suggestions = []
    if not suggestions:
        logger.info("fbf_cv_skill: no grouped master for '%s' (left unassigned)", skill.name)
        return
    best_master_id = int(suggestions[0]["id"])
    if best_master_id == skill.id:
        return
    _ = await skill_dedup_service.assign_slave(db, skill.id, best_master_id)
    logger.info(
        "fbf_cv_skill: attached '%s' to master %d (similarity=%.3f)",
        skill.name,
        best_master_id,
        float(suggestions[0]["similarity"]),
    )


async def _resolve_or_create_slave(
    db: AsyncSession,
    *,
    core_db: AsyncSession,
    name: str,
    embedding_client: EmbeddingClient,
) -> SkillRef:
    """Return an existing skill by exact name, or create a new slave for it.

    A newly created slave gets an embedding and is flagged ``active``. In both
    cases the skill is attached to its most probable **grouped** master via the
    defined dedup pipeline.
    """
    existing = await skill_repository.get_by_name(db, name)
    if existing is not None:
        await _attach_to_best_grouped_master(db, skill=existing)
        return existing

    skill = await skill_repository.create(db, name=name)

    try:
        vector = await embedding_client.embed_text(name, core_db)
        await skill_repository.set_vector(db, skill.id, vector)
    except Exception:
        logger.exception("fbf_cv_skill: embedding failed for new skill '%s'", name)

    await _set_skill_active(db, skill.id)
    await db.flush()
    await _attach_to_best_grouped_master(db, skill=skill)
    return skill


async def add_project_skills(
    db: AsyncSession,
    *,
    project_id: int,
    names: list[str],
    core_db: AsyncSession,
    embedding_client: EmbeddingClient,
) -> None:
    """Ensure the requested skills exist and link them to the project.

    For every deduplicated name the skill is resolved (exact name) or created as
    a new slave via the FBF dedup pipeline, then linked to the project in
    ``project_skill`` (idempotent). The caller owns the transaction.
    """
    for raw_name in _dedupe_by_name(names):
        name = raw_name.strip()
        if not name:
            continue
        skill = await _resolve_or_create_slave(db, core_db=core_db, name=name, embedding_client=embedding_client)
        _ = await project_skill_repository.link(db, project_id, skill.id)
    logger.info("fbf_cv_skill: linked skills to project", project_id=project_id, skill_count=len(names))


async def exclude_project_skill(db: AsyncSession, *, name: str) -> None:
    """Detach one skill from its master, reject it and unassign it.

    The skill is looked up by exact name, detached from its master
    (``canonical_id = NULL``) and flagged ``rejected``. A rejected, ungrouped
    skill never renders. The caller owns the transaction.

    Raises:
        ValueError: If no skill with the given name exists.
    """
    skill = await skill_repository.get_by_name(db, name.strip())
    if skill is None:
        raise ValueError(f"Skill '{name}' not found.")
    await skill_dedup_service.unassign_skills(db, [skill.id])
    await skill_dedup_service.set_skills_status(db, [skill.id], _REJECTED_STATUS)
    logger.info("fbf_cv_skill: excluded skill", skill_id=skill.id)

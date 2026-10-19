"""Write/link side of the LLM skill extraction (persist + link).

Split out of ``SkillExtractionService`` (read/write split, ``check-file-length``
catalog §2.2): these functions persist newly extracted skills as ``pending``
rows, link them to a master project and classify its job role. They orchestrate
repositories/services only – no LLM, no session creation of their own (sessions
are passed in by the caller).
"""

from __future__ import annotations

import re

import structlog

from app.fbf.domain.skill_extraction_contract import ExtractedSkill, SkillExtractionResult
from app.fbf.repositories import (
    project_repository,
    project_skill_repository,
    skill_lookup_repository,
    skill_repository,
)
from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.tagging.repositories import tag_repository, taggable_repository

logger = structlog.get_logger(__name__)


async def set_skill_pending(db: AsyncSession, skill_id: int) -> None:
    """Set the core status ``pending`` on a skill (idempotent).

    Neu extrahierte Skills erhalten ueber ``core_statusable`` einen expliziten
    ``pending``-Status. Ohne Status bleiben sie unsichtbar in der Dedup-/
    Pending-Liste und fliessen nicht in die Score-/Kurations-Pfade ein.
    """
    from app.shared.status.repositories import status_repository, statusable_repository

    pending_status = await status_repository.get_by_name_for_type(db, "pending", "fbf_skill")
    if pending_status is not None:
        await statusable_repository.set_status(db, "fbf_skill", skill_id, pending_status.id)


async def persist_pending_skills(
    gjo_db: AsyncSession,
    core_db: AsyncSession,
    skills: list[ExtractedSkill],
    embedding_client: EmbeddingClient,
) -> int:
    """Persist newly seen skills as ``pending`` rows; skip existing names.

    Deduplicates within the batch and against the database (by unique
    ``name``).  Before creating a new pending, a cosine-similarity
    check against ALL existing skill vectors prevents near-duplicate
    entries: if a vector match above 85 % is found the skill is NOT
    created (the project will link to the matched skill instead).

    Curated values and tag assignments stay intact. The master status is
    **not** touched: a master is curated/global and never depends on the
    status of its slaves (A5 – no slave→master cascade).
    Only ``importance`` is seeded from the LLM guess;
    ``level``/``level_public`` remain unset until manual curation.
    The LLM-selected tags of each newly created skill are stored in
    ``fbf_skill_tag_junction`` (deduplicated per skill).

    Each newly created skill is immediately embedded via the
    ``EmbeddingService`` so the dedup-clustering endpoint has vectors
    available without a manual backfill step.

    Args:
        gjo_db: gjo_se_com DB session (Skill + Taggable).
        core_db: core DB session (OpenRouter credential for embedding).
        skills: Extrahierte Skills.

    Returns:
        Anzahl neu angelegter ``pending``-Skills.
    """
    tag_ids_by_name = await tag_repository.get_name_id_mapping(gjo_db)

    created = 0
    seen_names: set[str] = set()
    for extracted in skills:
        name = extracted.name.strip()
        if not name or name.casefold() in seen_names:
            continue
        seen_names.add(name.casefold())

        existing = await skill_repository.get_by_name(gjo_db, name)
        if existing is not None:
            continue

        # Cosine dedup: embed candidate → search all vectors → create as slave if match ≥ 85 %
        canonical_id: int | None = None
        vector: list[float] | None = None
        try:
            vector = await embedding_client.embed_text(name, core_db)
            cosine_match = await skill_lookup_repository.find_skill_by_cosine(gjo_db, vector)
            if cosine_match is not None:
                # Resolve to canonical master (follow chain)
                canonical_id = cosine_match.canonical_id or cosine_match.id
                logger.info(
                    "Cosine match for '%s' → '%s' (creating as slave, canonical_id=%d)",
                    name,
                    cosine_match.name,
                    canonical_id,
                )
        except Exception:
            logger.exception("Cosine dedup unavailable for '%s' – embedding failed, creating pending", name)

        skill = await skill_repository.create(
            gjo_db,
            name=name,
            importance=extracted.importance_guess,
            canonical_id=canonical_id,
        )

        # Neuen Skill als PENDING kuratieren (Status über core_statusable).
        # Ohne Status bleibt der Skill unsichtbar in der Dedup/Pending-Liste
        # (Status ist Voraussetzung für die Score- und Kurations-Pfade).
        await set_skill_pending(gjo_db, skill.id)

        # Store vector for future dedup comparisons
        try:
            if vector is None:
                vector = await embedding_client.embed_text(name, core_db)
            await skill_repository.set_vector(gjo_db, skill.id, vector)
        except Exception:
            logger.exception("Auto-embed failed for skill '%s' (deferred to backfill)", name)

        tag_ids: list[int] = []
        for tag_name in sorted({tag.value for tag in getattr(extracted, "tags", [])}):
            tag_id = tag_ids_by_name.get(tag_name)
            if tag_id is None:
                logger.warning("skip unknown tag '%s' for skill '%s' (not seeded)", tag_name, name)
                continue
            tag_ids.append(tag_id)
        if tag_ids:
            await taggable_repository.set_tags(gjo_db, "fbf_skill", skill.id, tag_ids)

        created += 1

    if created:
        await gjo_db.commit()
    return created


async def link_skills_to_master(
    gjo_db: AsyncSession,
    project_id: int,
    skills: list[ExtractedSkill],
) -> int:
    """Link extracted skills to the master and recompute its match score.

    Each extracted name is resolved to its skill id and linked idempotently
    via ``project_skill``. After the links are written, the project's
    ``match_score`` is recalculated and persisted.

    Args:
        gjo_db: gjo_se_com DB session (Project + Skill + ProjectSkill).
        project_id: Master project primary key.
        skills: Extrahierte Skills.

    Returns:
        Anzahl neu angelegter ``project_skill``-Verknuepfungen.
    """
    from app.fbf.services import project_service

    # extraction is SSOT — clear prior links before writing fresh ones
    await project_skill_repository.delete_by_project(gjo_db, project_id)

    linked = 0
    seen_ids: set[int] = set()
    for extracted in skills:
        name = extracted.name.strip()
        if not name:
            continue
        skill = await skill_repository.get_by_name(gjo_db, name)

        if skill is None or skill.id in seen_ids:
            continue
        seen_ids.add(skill.id)
        if await project_skill_repository.link(
            gjo_db,
            project_id,
            skill.id,
            importance=extracted.importance_guess,
        ):
            linked += 1

    await gjo_db.commit()
    await project_service.recalculate_match_score(gjo_db, project_id)
    return linked


async def apply_job_role(gjo_db: AsyncSession, master: ProjectOut, result: SkillExtractionResult) -> None:
    """Set ``master.job_role_id`` from the classification result.

    - ``job_role_match`` (validated confirmed role) → assign that role.
    - ``job_role_new`` → get-or-create a ``pending`` role and assign it.
    - neither → leave ``job_role_id`` as NULL (unknown role).

    The project is assigned immediately in both cases (confirmed match and
    newly created pending role), so no per-project manual step is required.

    Args:
        gjo_db: gjo_se_com DB session (Project + JobRole).
        master: The master project to classify.
        result: Validated extraction result.
    """
    from app.fbf.services import job_role_service

    name = result.job_role_match or result.job_role_new
    if not name:
        return
    name = name.strip()
    if not name:
        return

    role = await job_role_service.get_or_create_by_name(gjo_db, name)
    await project_repository.set_job_role(gjo_db, master.id, role.id)
    await gjo_db.commit()


async def backfill_text_matches(
    gjo_db: AsyncSession,
    project_id: int,
) -> int:
    """Scan ``merged_description_de`` against ALL DB skills via substring matching.

    Complements the LLM extraction: finds skill names that appear literally
    in the description but were missed by the LLM. Only links — never
    creates new ``Skill`` rows.

    Args:
        gjo_db: gjo_se_com DB session.
        project_id: Master project primary key.

    Returns:
        Number of additionally linked skills.
    """
    from app.fbf.services import project_service

    master = await project_repository.get_out_by_id(gjo_db, project_id)
    if master is None or not master.merged_description_de:
        logger.debug("backfill_text_matches: project_id=%d skipped (no text)", project_id)
        return 0

    text = master.merged_description_de.lower()
    name_to_id = await skill_repository.get_name_id_mapping(gjo_db)
    if not name_to_id:
        return 0

    # Exclude skills that are already linked to this project (fetch once).
    existing = await skill_repository.get_scored_skills(gjo_db, project_id)
    existing_ids = {s.id for s, *_ in existing}

    # Sort by name length DESC ("Docker Compose" matches before "Docker").
    candidates = sorted(name_to_id.items(), key=lambda kv: len(kv[0]), reverse=True)
    matched_ids: set[int] = set()
    for name, sid in candidates:
        if sid in existing_ids or sid in matched_ids:
            continue
        if re.search(r"\b" + re.escape(name) + r"\b", text):
            matched_ids.add(sid)

    if not matched_ids:
        return 0

    linked = 0
    for skill_id in sorted(matched_ids):
        if await project_skill_repository.link(gjo_db, project_id, skill_id, importance=None):
            linked += 1

    if linked:
        await gjo_db.commit()
        await project_service.recalculate_match_score(gjo_db, project_id)
        logger.info(
            "backfill_text_matches: project_id=%d linked %d additional skills",
            project_id,
            linked,
        )

    return linked

"""Read-side queries for the FBF skill dedup board.

Extracted from the former monolithic ``skill_dedup_service`` (god-file split).
Holds only DB reads: the paginated board page (masters/slaves), the similarity
based candidate and suggestion ranking and the similar-masters view.
"""

from __future__ import annotations

from typing import Any

from app.fbf.repositories import skill_repository
from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services.skill_status_service import _get_skill_status
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.domain.similarity_rules import cosine_similarity
from app.shared.status.repositories import statusable_repository


async def get_board_page(
    db: AsyncSession,
    *,
    column: str,
    q: str | None = None,
    status: str | None = None,
    master_id: int | None = None,
    has_slaves: bool | None = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 0,
    size: int = 20,
) -> dict[str, Any]:
    """Return a paginated board page with progress metadata.

    Args:
        db: Database session.
        column: ``"masters"`` (canonical_id IS NULL) or ``"slaves"`` (set).
        q: Optional search term (ILIKE on name).
        status: Optional status filter.
        master_id: If set and column=slaves, only return slaves with canonical_id=master_id.
        has_slaves: If set and column=masters, filter masters by alias count
            (``True`` = with slaves, ``False`` = without slaves).
        sort_by: Sort field (``name``, ``status``, ``alias_count``).
        sort_order: ``"asc"`` or ``"desc"``.
        page: Zero-based page index.
        size: Items per page (default 20).

    Returns:
        Dict matching ``BoardPageOut`` schema keys.
    """
    skills_with_counts, total = await skill_repository.get_board_page(
        db,
        column=column,
        q=q,
        status=status,
        master_id=master_id,
        has_slaves=has_slaves,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        size=size,
    )

    # Resolve master_name for items with canonical_id
    canonical_ids = {s.canonical_id for s, _ in skills_with_counts if s.canonical_id is not None}
    master_map: dict[int, str] = {}
    if canonical_ids:
        masters = await skill_repository.get_by_ids(db, list(canonical_ids))
        master_map = {m.id: m.name for m in masters}

    items = []
    for skill, alias_count in skills_with_counts:
        status_entry = await statusable_repository.get_status(db, "fbf_skill", skill.id)
        status_val = status_entry.status.name if status_entry else "pending"
        items.append(
            {
                "id": skill.id,
                "name": skill.name,
                "description": skill.description,
                "status": status_val,
                "canonical_id": skill.canonical_id,
                "master_name": master_map.get(skill.canonical_id) if skill.canonical_id else None,
                "alias_count": alias_count,
                "importance": skill.importance,
                "level": skill.level,
                "level_public": skill.level_public,
            }
        )

    # Progress: confirmed masters / total masters
    checked_masters = await skill_repository.count_masters(db, active_only=True)
    total_masters = await skill_repository.count_masters(db)

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "checked_masters": checked_masters,
        "total_masters": total_masters,
    }


_SIMILARITY_TOP_K: int = 20


async def get_candidates(
    db: AsyncSession,
    master_id: int,
) -> list[dict[str, Any]]:
    """Return top-20 unassigned skills ranked by similarity to *master_id*.

    "Ohne Master" = skills whose ``canonical_id IS NULL`` and that have
    no other master pointing to them (i.e. are potential aliases).
    Archived skills and skills without a vector are excluded.

    Args:
        db: Database session.
        master_id: ID of the master skill to compare against.

    Returns:
        List of dicts with keys ``id``, ``name``, ``status``, ``similarity``.

    Raises:
        ValueError: If *master_id* is unknown or has no vector.
    """
    master = await skill_repository.get_by_id(db, master_id)
    if master is None:
        raise ValueError(f"Skill {master_id} not found.")
    if master.vector is None:
        raise ValueError(f"Skill {master_id} has no embedding vector.")

    candidates = await skill_repository.get_skills_with_vectors(db, canonical_id_is_none=True)
    # Exclude the master itself
    candidates = [c for c in candidates if c.id != master_id]

    scored = [
        {
            "id": c.id,
            "name": c.name,
            "status": await _get_skill_status(db, c.id),
            "similarity": cosine_similarity(master.vector, c.vector),
        }
        for c in candidates
        if c.vector is not None
    ]
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:_SIMILARITY_TOP_K]


async def get_suggestions(
    db: AsyncSession,
    slave_id: int,
    *,
    require_group: bool = False,
) -> list[dict[str, Any]]:
    """Return top-20 master skills ranked by similarity to *slave_id*.

    Masters = skills whose ``canonical_id IS NULL`` and that are not deprecated.
    With *require_group* the candidate set is restricted to curated masters that
    hang directly on a group (the ~100 renderable masters).

    Args:
        db: Database session.
        slave_id: ID of the slave skill to compare against.
        require_group: Restrict candidates to group-bound masters.

    Returns:
        List of dicts with keys ``id``, ``name``, ``status``, ``similarity``.

    Raises:
        ValueError: If *slave_id* is unknown or has no vector.
    """
    slave = await skill_repository.get_by_id(db, slave_id)
    if slave is None:
        raise ValueError(f"Skill {slave_id} not found.")
    if slave.vector is None:
        raise ValueError(f"Skill {slave_id} has no embedding vector.")

    masters = await skill_repository.get_skills_with_vectors(db, canonical_id_is_none=True, require_group=require_group)
    # Exclude the skill itself – masters without slaves may request suggestions too
    masters = [m for m in masters if m.id != slave_id]

    scored = [
        {
            "id": m.id,
            "name": m.name,
            "status": await _get_skill_status(db, m.id),
            "similarity": cosine_similarity(slave.vector, m.vector),
        }
        for m in masters
        if m.vector is not None
    ]
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:_SIMILARITY_TOP_K]


_SIMILAR_MASTERS_CANDIDATE_CAP: int = 500


async def get_similar_masters(
    db: AsyncSession,
    *,
    skill_ids: list[int],
    q: str | None = None,
    status: str | None = None,
    has_slaves: bool | None = None,
) -> list[dict[str, Any]]:
    """Rank masters by similarity to a single reference skill.

    Candidate base set: all masters (canonical_id IS NULL), optionally
    restricted via *has_slaves* (True = with slaves only, False = without
    slaves only, None = mixed). Toolbar filters (*q* / *status*) stay
    additive filters; similarity to the reference skill is the SORT
    order, not a filter. The reference skill itself and masters without an
    embedding vector are excluded.

    Scoring: every candidate gets the cosine similarity between the
    reference vector and the master vector. For masters WITH slaves, the
    final score is the **maximum** similarity across the master and all
    its slaves (best-group-member match). ``best_member_name`` /
    ``best_member_similarity`` report the closest group member.

    Args:
        db: Database session.
        skill_ids: Single-element list with the reference skill ID.
        q: Optional search term filter (ILIKE on name).
        status: Optional status filter (DB names).
        has_slaves: Optional alias-count restriction (see above).

    Returns:
        List of board-item dicts (id, name, status, canonical_id, master_name,
        alias_count, importance, level, level_public) plus ``similarity`` and
        optional ``best_member_name`` / ``best_member_similarity``, sorted
        descending by similarity.

    Raises:
        ValueError: If the reference skill does not exist or has no vector.
    """
    selected = await skill_repository.get_by_ids(db, skill_ids)
    if not selected:
        raise ValueError(f"Skills not found: {skill_ids}")

    vector = selected[0].vector
    if vector is None:
        raise ValueError("Reference skill has no embedding vector.")
    selected_id = selected[0].id

    candidates, _total = await skill_repository.get_board_page(
        db,
        column="masters",
        q=q,
        status=status,
        has_slaves=has_slaves,
        sort_by="name",
        sort_order="asc",
        page=0,
        size=_SIMILAR_MASTERS_CANDIDATE_CAP,
    )

    # ── Master-name score (cheap) ─────────────────────────────────────
    scored: list[dict[str, Any]] = [
        {
            "id": skill.id,
            "name": skill.name,
            "status": await _get_skill_status(db, skill.id),
            "canonical_id": skill.canonical_id,
            "master_name": None,
            "alias_count": alias_count,
            "importance": skill.importance,
            "level": skill.level,
            "level_public": skill.level_public,
            "similarity": cosine_similarity(vector, skill.vector),
            "best_member_name": None,
            "best_member_similarity": None,
        }
        for skill, alias_count in candidates
        if skill.vector is not None and skill.id != selected_id
    ]

    # ── Group refinement: max-value across master + all slaves ────────
    group_ids = [item["id"] for item in scored if item["alias_count"] > 0]

    if group_ids:
        group_slaves: dict[int, list[SkillRef]] = {}
        for slave in await skill_repository.get_slaves_with_vectors(db, group_ids):
            if slave.canonical_id is None:
                continue
            group_slaves.setdefault(slave.canonical_id, []).append(slave)

        for item in scored:
            if item["alias_count"] == 0:
                continue
            members = group_slaves.get(item["id"], [])

            # Best group member (max cosine)
            best_name = item["name"]
            best_score = item["similarity"]  # master score is the starting point
            for member in members:
                if member.vector is None:
                    continue
                member_score = cosine_similarity(vector, member.vector)
                if member_score > best_score:
                    best_name = member.name
                    best_score = member_score
            item["similarity"] = best_score
            item["best_member_name"] = best_name
            item["best_member_similarity"] = best_score

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored

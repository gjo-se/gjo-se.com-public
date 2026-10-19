"""Public and similarity lookup queries for FBF skills (gjo_se_com)."""

from __future__ import annotations

import numpy as np
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.skill import Skill
from app.fbf.repositories.skill_repository import SkillRef, to_skill_ref
from app.shared.tagging.models.tag import Tag, Taggable

_COSINE_THRESHOLD: float = 0.85


async def get_public_skills(
    db: AsyncSession,
    group_id: int | None = None,
    limit: int | None = None,
    tag: str = "site:public",
    grouped_only: bool = False,
) -> list[tuple[SkillRef, float | None]]:
    """Return skills tagged with ``tag`` and their global average importance.

    Each skill is returned together with the global average importance across
    all projects (``avg_importance_lookup``, master-resolved, blacklisted
    excluded) so the caller can compute the single blended
    ``effective_importance`` exactly like the Proof path.

    Args:
        db: Active async DB session.
        group_id: Optional skill-group filter.
        limit: Optional row limit.
        tag: Core tag name to select (default ``site:public``).
        grouped_only: When True, only skills with a ``group_id`` are returned.
            The public pages render exclusively grouped skills, so the ungrouped
            remainder is pure payload (``site:public`` tags every catalog skill).

    Returns:
        List of ``(Skill, avg_importance)`` tuples sorted by blended
        importance (global average first, then curated) DESC, name ASC.
    """
    from app.fbf.repositories.skill_repository import avg_importance_lookup

    public_ids = (
        select(Taggable.taggable_id)
        .join(Tag, Tag.id == Taggable.tag_id)
        .where(
            Taggable.taggable_type == "fbf_skill",
            Tag.name == tag,
        )
    ).scalar_subquery()
    avg_lookup = avg_importance_lookup()
    stmt: Select[tuple[Skill, float | None]] = (
        select(Skill, avg_lookup.c.avg_importance)
        .outerjoin(avg_lookup, avg_lookup.c.master_skill_id == Skill.id)
        .where(Skill.id.in_(public_ids))
        .order_by(
            Skill.group_id.asc().nulls_last(),
            Skill.sort.asc().nulls_last(),
            Skill.importance.desc().nulls_last(),
            Skill.name.asc(),
        )
    )
    if grouped_only:
        stmt = stmt.where(Skill.group_id.isnot(None))
    if group_id is not None:
        stmt = stmt.where(Skill.group_id == group_id)
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return [(to_skill_ref(row.Skill), row.avg_importance) for row in result.all()]


async def find_skill_by_cosine(
    db: AsyncSession,
    query_vector: list[float],
    threshold: float = _COSINE_THRESHOLD,
) -> SkillRef | None:
    """Return the best cosine match across ALL skills above *threshold*.

    Searches all ``fbf_skill`` rows with a non-NULL ``vector`` (masters *and*
    slaves).  The winner is resolved to its effective master via
    ``canonical_id``.  Returns ``None`` when no vector meets the threshold.

    Complexity: O(n) in-memory — acceptable for ~2 k skills.  Migrate to
    pgvector ``<=>`` if the dataset grows beyond ~10 k.
    """
    result = await db.execute(
        select(Skill.id, Skill.name, Skill.canonical_id, Skill.vector).where(Skill.vector.is_not(None))
    )
    rows = result.all()

    query = np.asarray(query_vector, dtype=np.float64)
    best_skill_id: int | None = None
    best_similarity = 0.0

    for skill_id, _name, _canonical, vec in rows:
        if vec is None:
            continue
        candidate = np.asarray(vec, dtype=np.float64)
        dot = float(np.dot(query, candidate))
        norm = float(np.linalg.norm(query) * np.linalg.norm(candidate))
        sim = dot / norm if norm > 0 else 0.0
        if sim > best_similarity:
            best_similarity = sim
            best_skill_id = skill_id

    if best_skill_id is None or best_similarity < threshold:
        return None

    best = await db.get(Skill, best_skill_id)
    return to_skill_ref(best) if best is not None else None

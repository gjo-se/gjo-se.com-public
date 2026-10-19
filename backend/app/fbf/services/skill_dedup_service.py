"""Dedup-Service für FBF Skills – Fassade und schreibende Operationen.

Die ehemalige God-File wurde in fokussierte Module gesplittet: Lesen
(Board, Kandidaten, Suggestions) liegt in ``skill_dedup_query_service``,
die Embedding-Berechnung in ``skill_dedup_embedding_service`` und die
Status-Helfer in ``skill_status_service``.  Dieses Modul ist die stabile
Import-Kante für alle Verbraucher (Router, ``cv_skill_service``, Tests) und
trägt die schreibenden Operationen (assign/activate/archive/unassign/status/
bulk/dissolve).
"""

from __future__ import annotations

from typing import Any

import structlog

from app.fbf.repositories import skill_repository
from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services.skill_dedup_embedding_service import compute_embeddings
from app.fbf.services.skill_dedup_query_service import (
    get_board_page,
    get_candidates,
    get_similar_masters,
    get_suggestions,
)
from app.fbf.services.skill_status_service import _get_skill_status, _set_skill_status
from app.shared.db_access.service_helpers import load_all_or_raise
from app.shared.db_access.session_types import AsyncSession
from app.shared.status.repositories import status_repository, statusable_repository

logger = structlog.get_logger(__name__)

__all__ = [
    "_ensure_skill_status",
    "_get_skill_status",
    "_set_skill_status",
    "_validate_bulk_action",
    "activate_master",
    "archive_skills",
    "assign_slave",
    "bulk_action",
    "compute_embeddings",
    "dissolve_group",
    "get_board_page",
    "get_candidates",
    "get_similar_masters",
    "get_suggestions",
    "set_skills_status",
    "skill_repository",
    "status_repository",
    "statusable_repository",
    "unassign_skills",
]


# ── Statusable helper (module local, uses the shared status module) ───────


async def _ensure_skill_status(db: AsyncSession, skill_id: int, status_name: str) -> bool:
    """Set status if not already set. Returns True if status was changed."""
    current = await _get_skill_status(db, skill_id)
    if current != status_name:
        await _set_skill_status(db, skill_id, status_name)
        return True
    return False


# ── Single-Item Mutations ──────────────────────────────────────────────────


async def assign_slave(
    db: AsyncSession,
    skill_id: int,
    master_id: int,
) -> dict[str, Any]:
    """Assign a slave skill to a master by setting ``canonical_id``.

    Also sets the assigned skill's status to ``confirmed``.

    Validates:
        - Both skills exist.
        - ``skill_id != master_id`` (no self-assign).
        - ``master_id`` is not itself a slave (its ``canonical_id IS NULL``).

    Raises:
        ValueError: If any validation fails.
    """
    skill = await skill_repository.get_by_id(db, skill_id)
    if skill is None:
        raise ValueError(f"Skill {skill_id} not found.")

    master = await skill_repository.get_by_id(db, master_id)
    if master is None:
        raise ValueError(f"Master skill {master_id} not found.")

    if skill_id == master_id:
        raise ValueError("Cannot assign a skill to itself.")

    if master.canonical_id is not None:
        raise ValueError(f"Skill {master_id} is not a master (has canonical_id={master.canonical_id}).")

    await skill_repository.set_canonical_id(db, skill_id, master_id)
    await _set_skill_status(db, skill_id, "active")
    await db.flush()
    logger.info("Assigned skill %d → master %d (confirmed).", skill_id, master_id)
    return {"updated": 1}


async def activate_master(
    db: AsyncSession,
    master_id: int,
    slave_ids: list[int],
) -> dict[str, Any]:
    """Activate a master and its verified slaves (set status=confirmed).

    Sets the master's status to ``CONFIRMED``.  For each ``slave_id`` in the
    list, validates it exists and ``canonical_id == master_id``, then also
    sets it to ``CONFIRMED``.

    Raises:
        ValueError: If master is unknown, or any slave is invalid.

    Returns:
        Dict with ``updated`` count.
    """
    master = await skill_repository.get_by_id(db, master_id)
    if master is None:
        raise ValueError(f"Master skill {master_id} not found.")

    updated = 0

    # Activate master
    if await _ensure_skill_status(db, master_id, "active"):
        updated += 1

    # Activate slaves
    if slave_ids:
        slaves = await load_all_or_raise(
            skill_repository.get_by_ids,
            db,
            slave_ids,
            label="Slave skills",
        )

        for slave in slaves:
            if slave.canonical_id != master_id:
                raise ValueError(
                    f"Skill {slave.id} is not assigned to master {master_id} (canonical_id={slave.canonical_id})."
                )
            if await _ensure_skill_status(db, slave.id, "active"):
                updated += 1

    await db.flush()
    logger.info("Activated master %d + %d slaves (%d status changes).", master_id, len(slave_ids), updated)
    return {"updated": updated}


async def archive_skills(
    db: AsyncSession,
    skill_ids: list[int],
) -> dict[str, Any]:
    """Archive skills by setting status=deprecated and detaching from master.

    Setzt ``status=deprecated`` und löst die Master-Slave-Beziehung auf
    (``canonical_id=NULL``).  Damit wird ein archivierter Slave von
    seinem Master getrennt (SP3 → archived trennt Slave vom Master).

    Raises:
        ValueError: If any skill ID is unknown.

    Returns:
        Dict with ``updated`` count.
    """
    skills = await load_all_or_raise(
        skill_repository.get_by_ids,
        db,
        skill_ids,
        label="Skills",
    )

    updated = 0
    for skill in skills:
        changed = False
        if await _ensure_skill_status(db, skill.id, "deprecated"):
            changed = True
        if skill.canonical_id is not None:
            await skill_repository.set_canonical_id(db, skill.id, None)
            changed = True
        if changed:
            updated += 1

    await db.flush()
    logger.info("Archived %d skills (changes: %d).", len(skill_ids), updated)
    return {"updated": updated}


async def set_skills_status(
    db: AsyncSession,
    skill_ids: list[int],
    status: str,
) -> dict[str, Any]:
    """Set the given DB status on all skills (idempotent per skill).

    Backs the status drop zones of the dedup board
    (pending / confirmed / archived).

    The status of a master is curated and independent of its slaves in
    both directions; slaves leaving CONFIRMED do not affect the master.

    Raises:
        ValueError: If any skill ID is unknown.

    Returns:
        Dict with ``updated`` count (skills whose status actually changed).
    """
    skills = await load_all_or_raise(
        skill_repository.get_by_ids,
        db,
        skill_ids,
        label="Skills",
    )

    updated = 0
    for skill in skills:
        if await _ensure_skill_status(db, skill.id, status):
            updated += 1

    await db.flush()

    logger.info("Set status=%s on %d skills (changes: %d).", status, len(skill_ids), updated)
    return {"updated": updated}


async def unassign_skills(
    db: AsyncSession,
    skill_ids: list[int],
) -> dict[str, Any]:
    """Remove master assignment by setting ``canonical_id=NULL`` and status to ``pending``.

    Only skills that currently have a ``canonical_id`` are affected.

    Raises:
        ValueError: If any skill ID is unknown.

    Returns:
        Dict with ``updated`` count.
    """
    skills = await load_all_or_raise(
        skill_repository.get_by_ids,
        db,
        skill_ids,
        label="Skills",
    )

    updated = 0
    for skill in skills:
        if skill.canonical_id is not None:
            await skill_repository.set_canonical_id(db, skill.id, None)
            if await _ensure_skill_status(db, skill.id, "pending"):
                pass
            updated += 1

    await db.flush()
    logger.info("Unassigned %d skills (changes: %d).", len(skill_ids), updated)
    return {"updated": updated}


# ── Bulk Mutation ──────────────────────────────────────────────────────────

_MIN_BULK_IDS: int = 1


async def _validate_bulk_action(
    db: AsyncSession,
    action: str,
    skills: list[SkillRef],
    skill_ids: list[int],
    master_id: int | None,
) -> None:
    """Up-front validation for :func:`bulk_action`; raises ``ValueError`` on any violation."""
    if action in ("assign", "activate"):
        if master_id is None:
            raise ValueError(f"master_id is required for {action}.")
        master = await skill_repository.get_by_id(db, master_id)
        if master is None:
            raise ValueError(f"Master skill {master_id} not found.")
        if action == "assign":
            if master.canonical_id is not None:
                raise ValueError(f"Skill {master_id} is not a master (has canonical_id={master.canonical_id}).")
            if any(skill.id == master_id for skill in skills):
                raise ValueError("Cannot assign a skill to itself.")
        else:  # activate
            for skill in skills:
                if master_id not in (skill.id, skill.canonical_id):
                    raise ValueError(
                        f"Skill {skill.id} is not assigned to master {master_id} (canonical_id={skill.canonical_id})."
                    )
    elif action not in ("deprecated", "unassign", "pending", "active", "rejected"):
        raise ValueError(f"Unknown action: {action}")


async def bulk_action(
    db: AsyncSession,
    *,
    action: str,
    skill_ids: list[int],
    master_id: int | None = None,
) -> dict[str, Any]:
    """Execute a single action on multiple skills in one pass.

    Validates ALL inputs up-front, then applies mutations.  If any
    validation step fails a ``ValueError`` is raised *before* any
    mutation runs – the caller's ``db.commit()`` is never reached,
    so the transaction stays clean (all-or-nothing).

    Args:
        db: Async database session.
        action: One of ``"assign"`` | ``"activate"`` | ``"deprecated"`` | ``"unassign"``
            | ``"pending"`` | ``"active"`` | ``"rejected"``.
        skill_ids: Non-empty list of skill IDs to operate on.
        master_id: Required when ``action == "assign"``.

    Returns:
        Dict with ``"updated"`` count.

    Raises:
        ValueError: On unknown action, invalid IDs, or business-rule violations.
    """
    if len(skill_ids) < _MIN_BULK_IDS:
        raise ValueError("skill_ids must contain at least one element.")

    # ── Validate IDs exist (up-front) ──────────────────────────────────────
    skills = await load_all_or_raise(
        skill_repository.get_by_ids,
        db,
        skill_ids,
        label="Skills",
    )

    # ── Validate action-specific pre-conditions ────────────────────────────
    await _validate_bulk_action(db, action, skills, skill_ids, master_id)

    # ── Apply mutations (reuse single-item functions for DRY) ──────────────
    updated = 0

    if action == "assign":
        if master_id is None:
            raise ValueError("master_id is required for assign.")
        for sid in skill_ids:
            if sid == master_id:
                continue
            result = await assign_slave(db, skill_id=sid, master_id=master_id)
            updated += result["updated"]

    elif action == "activate":
        if master_id is None:
            raise ValueError("master_id is required for activate.")
        result = await activate_master(db, master_id=master_id, slave_ids=skill_ids)
        updated = result["updated"]

    elif action == "unassign":
        result = await unassign_skills(db, skill_ids=skill_ids)
        updated = result["updated"]

    else:
        # The remaining status actions (deprecated/pending/active/rejected) map 1:1 to a status.
        result = await set_skills_status(db, skill_ids=skill_ids, status=action)
        updated = result["updated"]

    logger.info("Bulk %s: %d skills, %d updated.", action, len(skill_ids), updated)
    return {"updated": updated}


# ── Dissolve Group ──────────────────────────────────────────────────────────


async def dissolve_group(
    db: AsyncSession,
    master_id: int,
) -> dict[str, Any]:
    """Dissolve a master group completely.

    Finds all slaves (``canonical_id = master_id``), sets each slave's
    ``canonical_id`` to ``NULL`` and its ``status`` to ``PENDING``.  The
    master itself also gets ``status = PENDING`` so every card re-appears
    as an independent master without slaves.

    Args:
        db: Async database session.
        master_id: ID of the master whose group should be dissolved.

    Returns:
        Dict with ``updated`` count (how many skills were changed).

    Raises:
        ValueError: If the master does not exist or is not a master
            (has a non-null ``canonical_id``).
    """
    master = await skill_repository.get_by_id(db, master_id)
    if master is None:
        raise ValueError(f"Skill {master_id} not found.")
    if master.canonical_id is not None:
        raise ValueError(f"Skill {master_id} is not a master (has canonical_id={master.canonical_id}).")

    slaves = await skill_repository.get_slaves(db, master_id)

    updated = 0

    # Unassign and set pending for every slave
    for slave in slaves:
        await skill_repository.set_canonical_id(db, slave.id, None)
        if await _ensure_skill_status(db, slave.id, "pending"):
            updated += 1

    # Set master to pending as well
    if await _ensure_skill_status(db, master_id, "pending"):
        updated += 1

    await db.flush()
    logger.info(
        "Dissolved group of master %d: %d slaves freed (%d status changes).",
        master_id,
        len(slaves),
        updated,
    )
    return {"updated": updated}

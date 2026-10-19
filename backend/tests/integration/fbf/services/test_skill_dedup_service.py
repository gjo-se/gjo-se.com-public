"""Integration tests for ``skill_dedup_service`` against the container DB.

Covers the deterministic dedup kernel through the public interface: linking a
slave to its master (assign), freeing a group (dissolve) and the cosine-similarity
suggestion ranking. Risk-based – not every branch of the 700+ line service.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.skill import Skill
from app.fbf.repositories import skill_repository
from app.fbf.services import skill_dedup_service
from app.shared.status.models.status import Status
from app.shared.status.repositories import statusable_repository

pytestmark = pytest.mark.integration


async def _seed_skill_statuses(db: AsyncSession, *names: str) -> dict[str, int]:
    """Persist ``fbf_skill``-scoped statuses and return ``name -> id``."""
    ids: dict[str, int] = {}
    for index, name in enumerate(names):
        status = Status(
            name=name,
            slug=f"fbf-skill-{name}",
            category="general",
            color_token="gray",
            sort_order=float(index),
            scope=["fbf_skill"],
        )
        db.add(status)
        await db.flush()
        ids[name] = status.id
    return ids


async def test_assign_slave_links_to_master_and_activates(db_session: AsyncSession) -> None:
    """Assigning a slave writes ``canonical_id`` and flags it active."""
    await _seed_skill_statuses(db_session, "active")
    master = Skill(name="API")
    db_session.add(master)
    await db_session.flush()
    slave = Skill(name="REST API")
    db_session.add(slave)
    await db_session.flush()
    slave_id = slave.id

    result = await skill_dedup_service.assign_slave(db_session, slave_id, master.id)

    assert result == {"updated": 1}
    stored = await skill_repository.get_by_id(db_session, slave_id)
    assert stored is not None
    assert stored.canonical_id == master.id
    entry = await statusable_repository.get_status(db_session, "fbf_skill", slave_id)
    assert entry is not None
    assert entry.status.name == "active"


async def test_assign_slave_rejects_self_assignment_and_non_master(db_session: AsyncSession) -> None:
    """Self-assignment and assigning to a non-master are both refused."""
    await _seed_skill_statuses(db_session, "active")
    master = Skill(name="Master")
    db_session.add(master)
    await db_session.flush()
    slave = Skill(name="Slave", canonical_id=master.id)
    db_session.add(slave)
    await db_session.flush()

    with pytest.raises(ValueError, match="itself"):
        await skill_dedup_service.assign_slave(db_session, master.id, master.id)
    with pytest.raises(ValueError, match="not a master"):
        await skill_dedup_service.assign_slave(db_session, master.id, slave.id)


async def test_dissolve_group_frees_slaves_and_resets_to_pending(db_session: AsyncSession) -> None:
    """Dissolving a group clears every slave's ``canonical_id`` and sets pending."""
    await _seed_skill_statuses(db_session, "active", "pending")
    master = Skill(name="Group Master")
    db_session.add(master)
    await db_session.flush()
    first = Skill(name="Gruppe Eins", canonical_id=master.id)
    second = Skill(name="Gruppe Zwei", canonical_id=master.id)
    db_session.add_all([first, second])
    await db_session.flush()
    first_id, second_id = first.id, second.id
    await skill_dedup_service.set_skills_status(db_session, [master.id, first_id, second_id], "active")

    result = await skill_dedup_service.dissolve_group(db_session, master.id)

    assert result == {"updated": 3}
    for skill_id in (first_id, second_id):
        stored = await skill_repository.get_by_id(db_session, skill_id)
        assert stored is not None
        assert stored.canonical_id is None
        entry = await statusable_repository.get_status(db_session, "fbf_skill", skill_id)
        assert entry is not None
        assert entry.status.name == "pending"


async def test_get_suggestions_ranks_most_similar_master_first(db_session: AsyncSession) -> None:
    """Masters are ranked by cosine similarity to the reference skill, best first."""
    nearest = Skill(name="Nah", vector=[1.0, 0.0, 0.0])
    farthest = Skill(name="Fern", vector=[0.0, 1.0, 0.0])
    db_session.add_all([nearest, farthest])
    await db_session.flush()
    reference = Skill(name="Referenz", vector=[1.0, 0.0, 0.0])
    db_session.add(reference)
    await db_session.flush()

    suggestions = await skill_dedup_service.get_suggestions(db_session, reference.id)

    assert [item["id"] for item in suggestions] == [nearest.id, farthest.id]
    assert suggestions[0]["similarity"] == pytest.approx(1.0)
    assert suggestions[1]["similarity"] == pytest.approx(0.0)

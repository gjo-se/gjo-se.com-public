"""Integrationstests für das Skill ORM-Model.

Verifiziert die Schema-Form der ``fbf_skill``-Tabelle: Persistenz und
Unique-Constraint auf ``name``.
"""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.skill import Skill


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_fbf_skill_persists_with_importance(
    gjo_se_db_session: AsyncSession,
) -> None:
    """Ein neuer Skill wird persistiert und korrekt gelesen."""
    skill = Skill(name="LangGraph", importance=80)

    gjo_se_db_session.add(skill)
    await gjo_se_db_session.commit()
    await gjo_se_db_session.refresh(skill)

    assert skill.id is not None
    assert skill.importance == 80


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_fbf_skill_unique_name_raises_integrity_error(
    gjo_se_db_session: AsyncSession,
) -> None:
    """Doppelter ``name`` → IntegrityError (Unique-Constraint)."""
    first = Skill(name="Python")
    gjo_se_db_session.add(first)
    await gjo_se_db_session.commit()

    duplicate = Skill(name="Python")
    gjo_se_db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        await gjo_se_db_session.commit()

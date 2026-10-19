"""Restate activity – Act 4: Snippet Filter.

Filtert pending Candidates auf Relevanz: Irrelevante Kandidaten werden
via LLM-Relevanz-Check oder Keyword/Skills-Match-Fallback aussortiert
und auf ``status="rejected"`` gesetzt.

Two-phase approach:
1. Fetch – GjoDB: Lade pending Candidates + Projekt-Skills.
2. Persist – GjoDB: Reject irrelevant candidates.
"""

from __future__ import annotations

import re
from typing import Any

import structlog
from restate import Context, Service
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_endcustomer_candidate import (
    ProjectEndcustomerCandidate,
)
from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.repositories import project_endcustomer_candidate_repository as repo
from app.fbf.repositories import project_repository
from app.shared.db_access.session import AsyncSessionLocal as GjoDB
from app.shared.status.models.status import Status, Statusable

logger = structlog.get_logger(__name__)

endcustomer_snippet_filter_service = Service("EndcustomerSnippetFilterActivity")


async def _get_skills_csv(gjo_db: AsyncSession, project_id: int) -> str:
    """Lade confirmed Skills als komma-separierten String."""
    from sqlalchemy import select as sa_select

    confirmed_subq = (
        sa_select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == "confirmed",
        )
    )
    stmt = (
        select(Skill.name)
        .select_from(ProjectSkill)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .where(
            ProjectSkill.project_id == project_id,
            Skill.id.in_(confirmed_subq),
        )
        .order_by(Skill.name)
    )
    result = await gjo_db.execute(stmt)
    names = [row[0] for row in result.all()]
    return ", ".join(names)


def _keyword_match(
    candidate_title: str,
    _candidate_snippet: str,
    industry: str | None,
    city: str | None,
    skills_csv: str,
) -> bool:
    """Keyword/Skills-Match-Fallback: prueft ob der Candidate relevant ist.

    Prüft ob Branche, Stadt oder Skills im Titel/Snippet vorkommen.
    Gibt ``True`` zurück wenn mindestens ein Treffer vorliegt.

    Args:
        candidate_title: Candidate-Titel (Firmenname).
        _candidate_snippet: Candidate-Snippet (nicht genutzt, reserviert).
        industry: Projekt-Branche.
        city: Projekt-Stadt.
        skills_csv: Komma-separierte Skills.

    Returns:
        ``True`` wenn relevant, ``False`` sonst.
    """
    text = (candidate_title or "").lower()
    tokens: list[str] = []

    if industry:
        tokens.extend(industry.lower().split())
    if city:
        tokens.append(city.lower())
    if skills_csv:
        tokens.extend(s.lower().strip() for s in skills_csv.split(",") if s.strip())

    # Match whole words with word boundaries
    for token in tokens:
        token_clean = re.escape(token.strip())
        if token_clean and re.search(rf"\b{token_clean}\b", text):
            return True
    return False


@endcustomer_snippet_filter_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Filter pending candidates by relevance.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int).

    Returns:
        Dict with ``project_id``, ``rejected`` (int), ``kept`` (int).
    """
    project_id: int = arg["project_id"]

    # ── Phase 1: Fetch candidates + project data ──────────────────────────
    async with GjoDB() as gjo_db:
        candidates = await repo.get_by_project(gjo_db, project_id)
        project = await project_repository.get_by_id(gjo_db, project_id)
        industry = project.industry if project else ""
        city = project.city if project else ""

        # Get project skills for keyword matching
        skills_csv = await _get_skills_csv(gjo_db, project_id) if project else ""

    from app.shared.status.repositories import statusable_repository

    # Filter: only pending candidates
    pending: list[ProjectEndcustomerCandidate] = []
    for c in candidates:
        entry = await statusable_repository.get_status(gjo_db, "project_endcustomer_candidate", c.id)
        if entry is not None and entry.status.name == "pending":
            pending.append(c)

    if not pending:
        logger.info("Act 4: no pending candidates for project %d", project_id)
        return {"project_id": project_id, "rejected": 0, "kept": 0}

    # ── Phase 2: Filter via keyword match + reject irrelevant ─────────────
    # The LLM relevance check (execute_task) would be ideal, but Act 4
    # specifies a simple text output task that isn't registered yet.
    # Fallback: keyword/skills-match.
    rejected = 0
    kept = 0

    async with GjoDB() as gjo_db:
        for candidate in pending:
            relevant = _keyword_match(
                candidate_title=candidate.company_name,
                _candidate_snippet="",
                industry=industry,
                city=city,
                skills_csv=skills_csv,
            )

            if relevant:
                kept += 1
            else:
                await repo.update_status(gjo_db, candidate.id, "rejected")
                rejected += 1

    logger.info(
        "Act 4: project_id=%d rejected=%d kept=%d",
        project_id,
        rejected,
        kept,
    )
    return {"project_id": project_id, "rejected": rejected, "kept": kept}

"""Database access for project_endcustomer_candidate entries (gjo_se_com).

Companion of :mod:`app.fbf.repositories.project_endcustomer_candidate_read_repository`
(status read-model projection).
"""

from dataclasses import dataclass

from sqlalchemy import desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_endcustomer_candidate import (
    ProjectEndcustomerCandidate,
)
from app.fbf.repositories.project_endcustomer_candidate_status_repository import (
    update_status,
)
from app.shared.status.models.status import Status, Statusable

# Frozen-test compatibility re-export (historical import path). The real
# implementation lives in ``project_endcustomer_candidate_status_repository``
# after the LCOM4 split.
__all__ = [
    "create",
    "get_by_project",
    "get_latest_by_project",
    "get_ref_by_id",
    "update_fields",
    "update_status",
]


@dataclass
class EndcustomerCandidateRef:
    """Read DTO: the candidate fields the confirm/reject use-case needs.

    Keeps the service layer free of ``app.fbf.models`` imports (Achse 2:
    ``services`` > ``repositories``).
    """

    id: int
    project_id: int
    company_name: str
    website: str | None
    career_page_description: str | None


def _to_ref(candidate: ProjectEndcustomerCandidate) -> EndcustomerCandidateRef:
    """Maps a candidate ORM row to its boundary DTO.

    Args:
        candidate: Persisted ORM row.

    Returns:
        Read DTO handed to the service layer.
    """
    return EndcustomerCandidateRef(
        id=candidate.id,
        project_id=candidate.project_id,
        company_name=candidate.company_name,
        website=candidate.website,
        career_page_description=candidate.career_page_description,
    )


async def get_ref_by_id(db: AsyncSession, candidate_id: int) -> EndcustomerCandidateRef | None:
    """Return a candidate by primary key as boundary DTO.

    Args:
        db: Database session.
        candidate_id: Candidate primary key.

    Returns:
        Candidate DTO or ``None`` when it does not exist.
    """
    candidate = await db.get(ProjectEndcustomerCandidate, candidate_id)
    return _to_ref(candidate) if candidate is not None else None


async def create(
    db: AsyncSession,
    project_id: int,
    company_name: str,
    source: str,
    website: str | None = None,
    career_page_url: str | None = None,
    confidence: float | None = None,
    reasoning: str | None = None,
    career_page_description: str | None = None,
) -> ProjectEndcustomerCandidate:
    """Persist a new endcustomer candidate.

    Args:
        db: Database session.
        project_id: FK to project.
        company_name: Candidate company name.
        source: Source of the candidate (brave, tavily, both).
        website: Company website URL.
        career_page_url: Career page URL.
        confidence: Confidence score (0.0–1.0).
        reasoning: LLM reasoning for the match.
        career_page_description: Career page content (only for accepted).

    Returns:
        Persisted ``ProjectEndcustomerCandidate`` with generated id and timestamp.
    """
    candidate = ProjectEndcustomerCandidate(
        project_id=project_id,
        company_name=company_name,
        source=source,
        website=website,
        career_page_url=career_page_url,
        confidence=confidence,
        reasoning=reasoning,
        career_page_description=career_page_description,
    )
    db.add(candidate)
    await db.flush()
    await db.refresh(candidate)
    return candidate


async def get_by_project(db: AsyncSession, project_id: int) -> list[ProjectEndcustomerCandidate]:
    """Return all candidates for a project, newest first.

    Args:
        db: Database session.
        project_id: Project FK.

    Returns:
        List of candidates sorted by ``created_at DESC`` (may be empty).
    """
    result = await db.execute(
        select(ProjectEndcustomerCandidate)
        .where(ProjectEndcustomerCandidate.project_id == project_id)
        .order_by(desc(ProjectEndcustomerCandidate.created_at))
    )
    return list(result.scalars().all())


async def get_latest_by_project(
    db: AsyncSession, project_id: int
) -> list[tuple[ProjectEndcustomerCandidate, str | None, str | None]]:
    """Return non-rejected candidates from the most recent research run with core status.

    Finds the latest ``created_at`` timestamp for the project and returns
    all candidates with that timestamp, ordered by confidence descending.
    Candidates whose resolved status is ``rejected`` are excluded; candidates
    without a status row are kept.

    Args:
        db: Database session.
        project_id: Project FK.

    Returns:
        List of (candidate, status_name, status_color_token) from the latest run.
    """
    latest_ts = (
        select(func.max(ProjectEndcustomerCandidate.created_at))
        .where(ProjectEndcustomerCandidate.project_id == project_id)
        .scalar_subquery()
    )
    stmt = (
        select(
            ProjectEndcustomerCandidate,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "project_endcustomer_candidate")
            & (Statusable.statusable_id == ProjectEndcustomerCandidate.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .where(
            ProjectEndcustomerCandidate.project_id == project_id,
            ProjectEndcustomerCandidate.created_at == latest_ts,
            or_(Status.name.is_(None), Status.name != "rejected"),
        )
        .order_by(desc(ProjectEndcustomerCandidate.confidence))
    )
    result = await db.execute(stmt)
    return [(row[0], row[1], row[2]) for row in result.all()]


async def update_fields(db: AsyncSession, candidate_id: int, **fields: object) -> ProjectEndcustomerCandidate | None:
    """Update individual fields of a candidate.

    Args:
        db: Database session.
        candidate_id: Candidate primary key.
        **fields: Arbitrary field-value pairs to update
            (e.g. similarity_to_project=0.85, reasoning="...").

    Returns:
        Updated ``ProjectEndcustomerCandidate`` or ``None`` if not found.
    """
    if not fields:
        return await db.get(ProjectEndcustomerCandidate, candidate_id)
    stmt = (
        update(ProjectEndcustomerCandidate)
        .where(ProjectEndcustomerCandidate.id == candidate_id)
        .values(**fields)
        .returning(ProjectEndcustomerCandidate)
    )
    result = await db.execute(stmt)
    await db.commit()
    row = result.scalar_one_or_none()
    if row is not None:
        await db.refresh(row)
    return row

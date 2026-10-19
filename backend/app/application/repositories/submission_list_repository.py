"""Database access for the paginated application-submission list and counts.

Extracted from ``submission_repository``: this module owns the filter family
(``_search_filter``/``_apply_filters``), the correlated ``last_score`` subquery
and the paginated list/count queries. Single-record reads and write helpers stay
in ``submission_repository``.
"""

from collections.abc import Sequence
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import Select, and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.application.models.score_run import ScoreRun
from app.application.models.submission import Submission
from app.application.schemas.submission_schemas import StatusOut, SubmissionListOut
from app.shared.status.models.status import Status, Statusable

#: Polymorphic ``statusable_type`` used for application submissions.
_STATUSABLE_TYPE = "application_submission"

# Type of a sortable mapped column (kept free of ``Any``/``object``).
_SortColumn = (
    InstrumentedAttribute[int]
    | InstrumentedAttribute[str]
    | InstrumentedAttribute[str | None]
    | InstrumentedAttribute[datetime]
)

# Columns directly on Submission
_SUBMISSION_SORTABLE: dict[str, _SortColumn] = {
    "id": Submission.id,
    "subject": Submission.subject,
    "recipient_display_name": Submission.recipient_display_name,
    "recipient_company_name": Submission.recipient_company_name,
    "created_at": Submission.created_at,
    "updated_at": Submission.updated_at,
}

# Sort-by keys that require JOIN – resolved inside list_paginated()
_JOIN_SORT_KEYS: frozenset[str] = frozenset({"project_title"})

# Sort-by keys backed by a correlated scalar subquery – resolved in list_paginated()
_EXPR_SORT_KEYS: frozenset[str] = frozenset({"last_score"})

_DEFAULT_SORT = "created_at"
_DEFAULT_SORT_ORDER = "desc"


def _latest_score_expr():
    """Correlated scalar subquery: ``total_score`` of the newest run per submission.

    Ties on ``created_at`` are broken by ``id`` (mirrors
    ``score_run_repository``). Submissions without a run (or an
    unfinished run) yield ``NULL``.
    """
    return (
        select(ScoreRun.total_score)
        .where(ScoreRun.application_submission_id == Submission.id)
        .order_by(desc(ScoreRun.created_at), desc(ScoreRun.id))
        .limit(1)
        .correlate(Submission)
        .scalar_subquery()
    )


def _search_filter(q: str, title_subq: Any | None):
    """Builds the search predicate over the list's visible columns + project.

    A purely numeric ``q`` is treated as an exact project-id lookup (no partial
    matching, no text fallback) – ``"2"`` must not match project ``2929``.
    Otherwise the term matches ``subject``/``recipient_display_name``/
    ``recipient_company_name`` and the linked project ``title``/curated
    ``title_normalized`` via ILIKE. The project columns are matched through the
    owner-provided ``title_subq`` (no direct fbf import); when it is ``None``
    the project title is not searched.
    """
    stripped = q.strip()
    if stripped.isdigit():
        return Submission.project_id == int(stripped)
    pattern = f"%{q}%"
    predicates = [
        Submission.subject.ilike(pattern),
        Submission.recipient_display_name.ilike(pattern),
        Submission.recipient_company_name.ilike(pattern),
    ]
    if title_subq is not None:
        predicates.append(
            Submission.project_id.in_(
                select(title_subq.c.project_id).where(
                    or_(
                        title_subq.c.title.ilike(pattern),
                        title_subq.c.title_normalized.ilike(pattern),
                    )
                )
            )
        )
    return or_(*predicates)


def _apply_filters(
    stmt: Select[Any],
    *,
    q: str | None,
    status: str | None,
    project_ids: Sequence[int] | None,
    project_id: int | None,
    from_date: date | None,
    to_date: date | None,
    title_subq: Any | None,
) -> Select[Any]:
    """Applies the shared submission filters to *stmt* (used by list and count)."""
    if q:
        stmt = stmt.where(_search_filter(q, title_subq))
    if status is not None:
        stmt = stmt.where(Status.name == status)
    if project_ids is not None:
        stmt = stmt.where(Submission.project_id.in_(list(project_ids)))
    if project_id is not None:
        stmt = stmt.where(Submission.project_id == project_id)
    if from_date is not None:
        stmt = stmt.where(Submission.created_at >= from_date)
    if to_date is not None:
        # Add 1 day: created_at is timezone-aware, a naive date comparison
        # would miss the last day (e.g. "2026-07-02" midnight UTC).
        stmt = stmt.where(Submission.created_at < to_date + timedelta(days=1))
    return stmt


async def list_paginated(
    db: AsyncSession,
    q: str | None = None,
    status: str | None = None,
    project_ids: Sequence[int] | None = None,
    project_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = _DEFAULT_SORT,
    sort_order: str = _DEFAULT_SORT_ORDER,
    project_title_select: Select[Any] | None = None,
) -> list[tuple[SubmissionListOut, StatusOut | None]]:
    """Return paginated submissions with optional filters and resolved status.

    LEFT JOINs ``core_statusable``/``core_status`` so every row carries its
    status without N+1 queries. The CRM recipient person/company ids are *not*
    joined here (no cross-context data access) – the service resolves them via
    the shared CRM contact port. The ``project`` relationship is eager-loaded via
    ``lazy="selectin"`` on the model.

    Args:
        db: Database session.
        q: Search term. A purely numeric term is matched as an exact
            ``project_id``; otherwise it matches ``subject``/
            ``recipient_display_name``/``recipient_company_name`` and the project
            ``title``/``title_normalized`` via ILIKE (optional).
        status: Filter by exact status name (``core_status.name``).
        project_ids: Only submissions whose project is in this set (resolved by
            the caller via the CRM contact port; an empty sequence yields no
            rows). ``None`` disables the filter.
        project_id: Only submissions of this project (e.g. the application
            history of a single project; optional).
        from_date: Lower bound for ``created_at`` (inclusive, optional).
        to_date: Upper bound for ``created_at`` (inclusive, optional).
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Column to sort by (default ``created_at``). Supports
            submission columns, ``project_title`` from the project JOIN and
            ``last_score`` (score of the submission's latest run; unscored last).
        sort_order: ``asc`` or ``desc``.
        project_title_select: Optional owner-provided project-title projection.

    Returns:
        List of ``(submission, status)`` tuples.
    """
    title_subq = project_title_select.subquery() if project_title_select is not None else None
    sort_key = (
        sort_by
        if sort_by in _SUBMISSION_SORTABLE or sort_by in _JOIN_SORT_KEYS or sort_by in _EXPR_SORT_KEYS
        else _DEFAULT_SORT
    )
    if sort_key == "last_score":
        sort_col = _latest_score_expr()
    elif sort_key in _JOIN_SORT_KEYS and title_subq is not None:
        sort_col = title_subq.c.title
    else:
        # Includes ``project_title`` without an owner-provided projection.
        sort_col = _SUBMISSION_SORTABLE.get(sort_key, Submission.created_at)
    if sort_key == "last_score":
        # Unscored submissions (NULL) always sort last, regardless of direction.
        order_expr = desc(sort_col).nullslast() if sort_order == "desc" else asc(sort_col).nullslast()
    else:
        order_expr = desc(sort_col) if sort_order == "desc" else asc(sort_col)

    stmt = (
        select(Submission, Status)
        .outerjoin(
            Statusable,
            and_(
                Statusable.statusable_type == _STATUSABLE_TYPE,
                Statusable.statusable_id == Submission.id,
            ),
        )
        .outerjoin(Status, Statusable.status_id == Status.id)
        .order_by(order_expr)
    )
    if sort_key in _JOIN_SORT_KEYS and title_subq is not None:
        stmt = stmt.outerjoin(title_subq, title_subq.c.project_id == Submission.project_id)
    stmt = _apply_filters(
        stmt,
        q=q,
        status=status,
        project_ids=project_ids,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
        title_subq=title_subq,
    )

    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    return [
        (
            SubmissionListOut.model_validate(submission),
            StatusOut.model_validate(status) if status is not None else None,
        )
        for submission, status in result.all()
    ]


async def count(
    db: AsyncSession,
    q: str | None = None,
    status: str | None = None,
    project_ids: Sequence[int] | None = None,
    project_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    project_title_select: Select[Any] | None = None,
) -> int:
    """Return total count of submissions, optionally filtered.

    Args:
        db: Database session.
        q: Search term. A purely numeric term is matched as an exact
            ``project_id``; otherwise it matches ``subject``/
            ``recipient_display_name``/``recipient_company_name`` and the project
            ``title``/``title_normalized`` via ILIKE (optional).
        status: Filter by exact status name (``core_status.name``).
        project_ids: Only submissions whose project is in this set (resolved by
            the caller via the CRM contact port; an empty sequence yields zero).
            ``None`` disables the filter.
        project_id: Only submissions of this project (optional).
        from_date: Lower bound for ``created_at`` (inclusive, optional).
        to_date: Upper bound for ``created_at`` (inclusive, optional).
        project_title_select: Optional owner-provided project-title projection.

    Returns:
        Total number of matching submissions.
    """
    stmt = select(func.count()).select_from(Submission)
    title_subq = project_title_select.subquery() if project_title_select is not None else None

    if status is not None:
        stmt = stmt.outerjoin(
            Statusable,
            and_(
                Statusable.statusable_type == _STATUSABLE_TYPE,
                Statusable.statusable_id == Submission.id,
            ),
        ).outerjoin(Status, Statusable.status_id == Status.id)
    stmt = _apply_filters(
        stmt,
        q=q,
        status=status,
        project_ids=project_ids,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
        title_subq=title_subq,
    )

    result = await db.execute(stmt)
    return result.scalar_one()

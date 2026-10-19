"""Dedup board queries for FBF skills (gjo_se_com).

Owns the paginated master/slave board with the correlated alias count used by
the dedup UI. The shared text/status filters and the read DTO live in
``skill_read_repository``.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import (
    ColumnElement,
    String,
    and_,
    asc,
    case,
    cast,
    desc,
    func,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.skill import Skill
from app.fbf.repositories.skill_read_repository import (
    SkillRef,
    skill_status_filter,
    skill_text_filter,
    to_skill_ref,
)
from app.shared.status.models.status import Status, Statusable

_BOARD_SORTABLE: dict[str, Any] = {
    "name": Skill.name,
}


def _count_where_clauses(
    *,
    column: str,
    master_id: int | None,
    has_slaves_clause: ColumnElement[bool] | None,
    q: str | None,
    status: str | None,
) -> list[ColumnElement[bool]]:
    """Build the WHERE clauses for the total-count query (mirrors the page query).

    Args:
        column: ``masters`` or ``slaves`` board column.
        master_id: Optional master id filter (only for ``column='slaves'``).
        has_slaves_clause: Optional alias-count filter (only for ``column='masters'``).
        q: Optional text/id search term.
        status: Optional status-name filter.

    Returns:
        The list of boolean WHERE clauses for the count query.
    """
    clauses: list[ColumnElement[bool]] = [
        Skill.canonical_id.is_(None) if column == "masters" else Skill.canonical_id.isnot(None),
    ]
    if master_id is not None and column == "slaves":
        clauses.append(Skill.canonical_id == master_id)
    if has_slaves_clause is not None:
        clauses.append(has_slaves_clause)
    if q:
        name_filter = Skill.name.ilike(f"%{q}%")
        id_filter = cast(Skill.id, String).ilike(f"%{q}%")
        clauses.append(or_(name_filter, id_filter) if q.isdigit() else name_filter)
    if status:
        clauses.append(
            Skill.id.in_(
                select(Statusable.statusable_id)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == "fbf_skill",
                    Status.name == status,
                )
            )
        )
    return clauses


def _order_expression(
    sort_by: str,
    sort_order: str,
    alias_count_expr: ColumnElement[Any],
) -> ColumnElement[Any]:
    """Resolve the ORDER BY expression (``alias_count`` is special-cased).

    Args:
        sort_by: Requested sort key.
        sort_order: ``asc`` (default) or ``desc``.
        alias_count_expr: The labelled alias-count expression.

    Returns:
        The SQLAlchemy ORDER BY expression.
    """
    column = alias_count_expr if sort_by == "alias_count" else _BOARD_SORTABLE.get(sort_by, Skill.name)
    return desc(column) if sort_order == "desc" else asc(column)


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
) -> tuple[list[tuple[SkillRef, int]], int]:
    """Paginated board query: masters (canonical_id IS NULL) or slaves.

    When *master_id* is set and *column=slaves*, only slaves whose
    ``canonical_id == master_id`` are returned.

    When *has_slaves* is set and *column=masters*, masters are filtered by
    alias count: ``True`` = at least one slave, ``False`` = no slaves.

    Returns:
        Tuple of (list of (skill DTO, alias_count), total matching count).
    """
    skill_table = Skill.__table__
    alias_ref = skill_table.alias("skill_ref")

    # Correlated subquery: count skills whose canonical_id = this skill's id
    alias_count_sub = (
        select(func.count())
        .where(alias_ref.c.canonical_id == skill_table.c.id)
        .correlate(skill_table)
        .scalar_subquery()
    )

    alias_count_expr = case(
        (skill_table.c.canonical_id.is_(None), alias_count_sub),
        else_=0,
    ).label("alias_count")

    stmt = select(Skill, alias_count_expr)

    # Filter: masters vs slaves
    if column == "masters":
        stmt = stmt.where(Skill.canonical_id.is_(None))
    else:
        stmt = stmt.where(Skill.canonical_id.isnot(None))

    if master_id is not None and column == "slaves":
        stmt = stmt.where(Skill.canonical_id == master_id)

    has_slaves_clause = None
    if has_slaves is not None and column == "masters":
        has_slaves_clause = alias_count_sub > 0 if has_slaves else alias_count_sub == 0
        stmt = stmt.where(has_slaves_clause)

    stmt = skill_text_filter(stmt, q)
    stmt = skill_status_filter(stmt, status)

    # Count
    where_clauses = _count_where_clauses(
        column=column,
        master_id=master_id,
        has_slaves_clause=has_slaves_clause,
        q=q,
        status=status,
    )
    count_stmt = select(func.count()).select_from(Skill).where(and_(*where_clauses))
    total = (await db.execute(count_stmt)).scalar_one()

    # Sort
    order_expr = _order_expression(sort_by, sort_order, alias_count_expr)
    stmt = stmt.order_by(order_expr).offset(page * size).limit(size)

    result = await db.execute(stmt)
    rows = result.all()
    return [(to_skill_ref(row[0]), row[1]) for row in rows], total

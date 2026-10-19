"""Repository for portfolio ``core_statusable`` status resolution (gjo_se_com).

Wraps the shared statusable repository so ``app/portfolio/services`` never
imports ``app.shared.status.models`` or builds queries (Achse 2: ``services`` >
``repositories``). The session is passed through by the caller (K3: no own
session in the service).
"""

from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.status.repositories import statusable_repository

_STATUSABLE_TYPE = "portfolio"


async def resolve_status_map(
    db: AsyncSession,
    portfolio_ids: Sequence[int],
) -> dict[int, tuple[str | None, str | None]]:
    """Returns ``portfolio_id -> (status_name, color_token)`` for the given ids.

    Args:
        db: Active async DB session.
        portfolio_ids: Ids of the portfolios to resolve.

    Returns:
        Mapping of portfolio id to ``(status_name, color_token)``; ids without a
        status assignment are absent from the mapping.
    """
    return await statusable_repository.resolve_status_map(db, _STATUSABLE_TYPE, portfolio_ids)


async def resolve_status_names(
    db: AsyncSession,
    portfolio_ids: Sequence[int],
) -> dict[int, str | None]:
    """Returns ``portfolio_id -> status_name`` for the given ids.

    Args:
        db: Active async DB session.
        portfolio_ids: Ids of the portfolios to resolve.

    Returns:
        Mapping of portfolio id to its status name; ids without a status
        assignment are absent from the mapping.
    """
    status_map = await resolve_status_map(db, portfolio_ids)
    return {portfolio_id: entry[0] for portfolio_id, entry in status_map.items()}


async def resolve_status(
    db: AsyncSession,
    portfolio_id: int,
) -> tuple[str | None, str | None] | None:
    """Returns ``(status_name, color_token)`` for one portfolio, or ``None``.

    Args:
        db: Active async DB session.
        portfolio_id: Id of the portfolio to resolve.

    Returns:
        The resolved ``(status_name, color_token)`` tuple or ``None`` when the
        portfolio has no status assignment.
    """
    return await statusable_repository.resolve_status(db, _STATUSABLE_TYPE, portfolio_id)


async def is_inactive(db: AsyncSession, portfolio_id: int) -> bool:
    """Returns whether a portfolio is publicly hidden via the ``inactive`` status.

    Args:
        db: Active async DB session.
        portfolio_id: Id of the portfolio to check.

    Returns:
        ``True`` when the portfolio's resolved status name is ``inactive``.
    """
    entry = await resolve_status(db, portfolio_id)
    return entry is not None and entry[0] == "inactive"

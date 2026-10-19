"""Reusable mixin for services that consume an injected ``AsyncSession``.

Every session-backed service stores its injected session under ``_db``. That
one-line ``__init__`` was duplicated across the LLM-gateway services
(``model_config``, ``observer_metrics``, ``observer_ticket``, ``eval_run``);
this mixin is the single source of truth for it. It is domain-free (imports no
context) and therefore lives in ``app.shared.db_access``.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession


class DatabaseConsumer:
    """Mixin storing an injected ``AsyncSession`` as ``_db``.

    Attributes:
        _db: The injected database session.
    """

    _db: AsyncSession

    def __init__(self, db: AsyncSession) -> None:
        """Store the injected database session.

        Args:
            db: Active database session.
        """
        self._db = db

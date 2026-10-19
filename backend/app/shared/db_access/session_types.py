"""Framework-neutral DB session type for service boundaries.

Re-exports ``AsyncSession`` so that ``services`` never import ``sqlalchemy``
directly. Architecture axis 2 (``skill("be-architecture-layers")``): services
orchestrate and own no ORM/query code; the import-linter contract
"Services do not build DB queries/ORM" forbids the external ``sqlalchemy``
package in ``app/**/services/**``. Services therefore obtain the session type
from here instead of ``sqlalchemy.ext.asyncio``.
"""

from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["AsyncSession"]

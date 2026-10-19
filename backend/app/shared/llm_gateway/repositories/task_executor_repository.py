"""Database access for the generic task executor (llm_gateway).

Provides the provider-key resolution for the circuit breaker and an isolated
session factory used for best-effort CB reporting. The service layer stays free
of ``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.credential_store.models.admin_credential import AdminCredential
from app.shared.db_access import session as _db_session
from app.shared.llm_gateway.models.task_model_config import TaskModelConfig

open_session = _db_session.open_session


async def resolve_provider_key(db: AsyncSession, task_key: str) -> str | None:
    """Resolves the provider key for circuit breaker from the task mapping.

    Returns ``None`` if no mapping/credential is configured, or if the db
    session does not support querying (e.g. in unit tests with mocks).
    """
    try:
        mapping = (
            await db.execute(
                select(TaskModelConfig).where(
                    TaskModelConfig.task == task_key,
                    TaskModelConfig.is_production == True,  # noqa: E712
                )
            )
        ).scalar_one_or_none()
    except TypeError:
        return None

    if mapping is None or mapping.credential_id is None:
        return None

    try:
        cred = await db.get(AdminCredential, mapping.credential_id)
    except TypeError:
        return None

    if cred is None:
        return None

    return cred.portal or cred.service

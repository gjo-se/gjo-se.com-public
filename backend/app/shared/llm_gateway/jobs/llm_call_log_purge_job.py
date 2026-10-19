"""Scheduled job: purge LLM call-log rows older than the retention window."""

from __future__ import annotations


async def purge_llm_call_logs() -> None:
    """Purge LLM call-log rows older than the configured retention window."""
    from app.shared.db_access.session import AsyncSessionLocal as CoreAsyncSessionLocal
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service

    async with CoreAsyncSessionLocal() as core_db:
        _ = await get_llm_call_log_service().purge_older_than(core_db)

"""Service layer for LLM provider registry (3-tier readiness, user-scoped).

The DB access lives in :mod:`...repositories.provider_repository`; the service
orchestrates providers only via domain records.
"""

from __future__ import annotations

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.provider_contract import ProviderRecord
from app.shared.llm_gateway.repositories import provider_repository
from app.shared.llm_gateway.schemas.model_schemas import LLMProviderStatusResponse
from app.shared.llm_gateway.services.provider_registry_service import PROVIDER_DISPLAY_NAMES, is_supported

logger = structlog.get_logger(__name__)


class LLMProviderService:
    """Queries LLM provider status combining DB data with code-side registry."""

    async def list_with_status(self, db: AsyncSession, user_id: int) -> list[LLMProviderStatusResponse]:
        """Return all DB providers with their 3-tier readiness status for *user_id*.

        Tier 1 – Known:     provider exists in ``llm_provider`` table.
        Tier 2 – Supported: provider is in ``PROVIDER_REGISTRY`` and package
            is importable.
        Tier 3 – Usable:    user has a key with ``valid_at`` set.

        Args:
            db: Active async database session.
            user_id: ID of the requesting user.

        Returns:
            List of :class:`LLMProviderStatusResponse` ordered alphabetically by name.
        """
        records = await provider_repository.list_with_user_keys(db, user_id)
        return [
            LLMProviderStatusResponse(
                id=record.id,
                name=record.name,
                display_name=record.display_name,
                is_supported=is_supported(record.name),
                has_key=record.key_id is not None,
                key_valid=record.valid_at is not None,
                key_label=record.label,
            )
            for record in records
        ]


async def get_or_create_provider(db: AsyncSession, provider_name: str) -> ProviderRecord:
    """Return the provider record for *provider_name*, creating it if absent.

    Args:
        db: Active async database session.
        provider_name: Provider identifier, e.g. ``'openai'``.

    Returns:
        The existing or newly created provider as a domain record.
    """
    display_name = PROVIDER_DISPLAY_NAMES.get(provider_name, provider_name.capitalize())
    return await provider_repository.get_or_create_by_name(db, provider_name, display_name)

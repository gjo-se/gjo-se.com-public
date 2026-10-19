"""Database-backed construction helpers for :class:`LLMClient`.

Extracted from the client core so the client module keeps a single
responsibility (invocation + instrumentation) while construction lives here.
``LLMClient`` composes this mixin via inheritance, keeping the public
``LLMClient.from_db`` / ``LLMClient._create`` classmethods stable.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.exceptions import LLMModelDisabledError

if TYPE_CHECKING:
    from app.shared.llm_gateway.client.client import LLMClient


class LLMClientFactoryMixin:
    """Construction helpers composed into :class:`LLMClient` via inheritance."""

    @classmethod
    async def from_db(
        cls,
        db: AsyncSession,
        user_id: int,
        openrouter_id: str,
    ) -> LLMClient:
        """Create an LLMClient with the API key loaded from the database.

        Looks up the model's native ID and provider via *openrouter_id*, asserts
        the model is active, then loads the encrypted key for *user_id*.

        Args:
            db: Active async database session.
            user_id: ID of the user whose key to load.
            openrouter_id: OpenRouter composite model ID, e.g. ``'openai/gpt-4o-mini'``.

        Returns:
            Configured :class:`LLMClient` instance.

        Raises:
            LLMModelDisabledError: Model not found or inactive.
            UserApiKeyNotFoundError: No key stored for the user/provider combination.
        """
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import (
            get_llm_model_service,
            get_user_api_key_service,
        )
        from app.shared.llm_gateway.models.model import LLMModel

        db_session = db
        model_row = await db_session.scalar(select(LLMModel).where(LLMModel.openrouter_id == openrouter_id))
        await get_llm_model_service().assert_model_active(db_session, model_row.id if model_row else -1)
        if model_row is None:
            raise LLMModelDisabledError(openrouter_id)
        _api_key = await get_user_api_key_service().get_key(
            db_session,
            user_id,
            model_row.provider_id,
        )
        return cast("type[LLMClient]", cls)(model=model_row.native_model_id)

    @classmethod
    def _create(cls, model: str, api_key: str) -> LLMClient:
        """Internal factory used in tests to bypass DB loading.

        Args:
            model: Model identifier string.
            api_key: Plaintext API key.

        Returns:
            Configured :class:`LLMClient`.
        """
        return cast("type[LLMClient]", cls)(model=model)

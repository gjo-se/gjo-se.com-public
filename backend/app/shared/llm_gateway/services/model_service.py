"""Service layer for the LLM model catalog.

Covers listing, filtering/sorting, toggling and price history. The OpenRouter
data-sync lives in :mod:`model_sync_service`. All DB access lives in
:mod:`...repositories.model_repository`; the service maps domain records to
response schemas.
"""

from __future__ import annotations

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.client.providers import _infer_provider, is_provider_installed
from app.shared.llm_gateway.domain.model_contract import ModelFilter, ModelRecord
from app.shared.llm_gateway.exceptions import LLMModelDisabledError
from app.shared.llm_gateway.repositories import model_repository
from app.shared.llm_gateway.repositories.model_query_repository import (
    _apply_sorting,
    _build_base_query,
)
from app.shared.llm_gateway.repositories.model_repository import (
    _modality_conditions,
    _price_condition,
)
from app.shared.llm_gateway.schemas.model_schemas import (
    LLMModelPatchIn,
    LLMModelPriceSnapshotResponse,
    LLMModelResponse,
)

logger = structlog.get_logger(__name__)


class LLMModelService:
    """Manages the LLM model catalog queries, CRUD and price history."""

    # Query-builder shims delegating to the repository; kept as class/module
    # attributes so internal references stay valid without a SQLAlchemy import
    # in the service layer itself.
    _build_base_query = staticmethod(_build_base_query)
    _apply_sorting = staticmethod(_apply_sorting)
    _modality_conditions = staticmethod(_modality_conditions)
    _price_condition = staticmethod(_price_condition)

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_by_id(
        self,
        db: AsyncSession,
        model_id: int,
    ) -> LLMModelResponse | None:
        """Return a single model by PK, or None if not found."""
        record = await model_repository.get_by_id(db, model_id)
        return None if record is None else self._to_response(record)

    async def list_all(
        self,
        db: AsyncSession,
        filters: ModelFilter,
        *,
        sort_by: str | None = None,
        sort_order: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[LLMModelResponse]:
        """Return models with SQL-level filtering, sorting, and pagination.

        Args:
            db: Active async database session.
            filters: Model-catalog filter parameters.
            sort_by: Sort column key (whitelist).
            sort_order: 'asc' or 'desc'.
            offset: Pagination offset.
            limit: Max rows to return.

        Returns:
            List of :class:`LLMModelResponse`.
        """
        records = await model_repository.list_models(
            db,
            filters,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=offset,
            limit=limit,
        )
        return [self._to_response(record) for record in records]

    async def count(
        self,
        db: AsyncSession,
        filters: ModelFilter,
    ) -> int:
        """Return count of models matching filters.

        Args:
            db: Active async database session.
            filters: Same filter parameters as :meth:`list_all`.

        Returns:
            Total number of matching models.
        """
        return await model_repository.count(db, filters)

    # ── Mapping ───────────────────────────────────────────────────────────────

    @staticmethod
    def _to_response(record: ModelRecord) -> LLMModelResponse:
        """Maps a repository model record to an :class:`LLMModelResponse`."""
        # Infer provider installation status from model's native ID prefix.
        try:
            provider = _infer_provider(record.native_model_id)
            provider_installed = is_provider_installed(provider)
        except ValueError:
            provider_installed = True  # Cannot infer → assume OK

        return LLMModelResponse(
            id=record.id,
            openrouter_id=record.openrouter_id,
            native_model_id=record.native_model_id,
            provider_id=record.provider_id,
            provider_name=record.provider_name,
            provider_display_name=record.provider_display_name,
            display_name=record.display_name,
            description=record.description,
            context_window=record.context_window,
            active=record.active,
            status=record.status,
            status_color_token=record.status_color_token,
            current_price_input=record.price_input,
            current_price_output=record.price_output,
            first_seen_at=record.first_seen_at,
            last_seen_at=record.last_seen_at,
            supported_parameters=record.supported_parameters,
            architecture=record.architecture,
            reasoning=record.reasoning,
            default_parameters=record.default_parameters,
            top_provider=record.top_provider,
            max_completion_tokens=record.max_completion_tokens,
            knowledge_cutoff=record.knowledge_cutoff,
            hugging_face_id=record.hugging_face_id,
            created=record.created,
            canonical_slug=record.canonical_slug,
            is_locally_installed=record.is_locally_installed,
            task_type=record.task_type,
            task_tags=record.task_tags,
            provider_installed=provider_installed,
        )

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def patch_model(self, db: AsyncSession, model_id: int, data: LLMModelPatchIn) -> LLMModelResponse:
        """Patch mutable fields (``active``, ``is_locally_installed``) on a model.

        Args:
            db: Active async database session.
            model_id: PK of the model to update.
            data: Patch payload (only non-None fields are applied).

        Returns:
            Updated :class:`LLMModelResponse`.

        Raises:
            LLMModelDisabledError: Model not found.
        """
        updated = await model_repository.update_flags(
            db,
            model_id,
            active=data.active,
            is_locally_installed=data.is_locally_installed,
        )
        if not updated:
            raise LLMModelDisabledError(f"LLM model {model_id} not found")
        models = await self.list_all(db, ModelFilter())
        found = next((m for m in models if m.id == model_id), None)
        if found is None:
            raise LLMModelDisabledError(f"LLM model {model_id} not found after update")
        return found

    async def patch_active(self, db: AsyncSession, model_id: int, data: LLMModelPatchIn) -> LLMModelResponse:
        """Toggle the ``active`` field for a model (backwards-compatible wrapper).

        Args:
            db: Active async database session.
            model_id: PK of the model to update.
            data: Patch payload.

        Returns:
            Updated :class:`LLMModelResponse`.

        Raises:
            LLMModelDisabledError: Model not found.
        """
        return await self.patch_model(db, model_id, data)

    async def get_price_history(self, db: AsyncSession, model_id: int) -> list[LLMModelPriceSnapshotResponse]:
        """Return all price snapshots for a model in chronological order.

        Args:
            db: Active async database session.
            model_id: PK of the model.

        Returns:
            List of :class:`LLMModelPriceSnapshotResponse` (oldest first).
        """
        records = await model_repository.get_price_history(db, model_id)
        return [
            LLMModelPriceSnapshotResponse(
                id=record.id,
                model_id=record.model_id,
                price_input=record.price_input,
                price_output=record.price_output,
                source=record.source,
                synced_at=record.synced_at,
            )
            for record in records
        ]

    async def assert_model_active(self, db: AsyncSession, model_id: int) -> None:
        """Assert that the model exists and is active.

        Args:
            db: Active async database session.
            model_id: PK of the model to check.

        Raises:
            LLMModelDisabledError: Model not found or ``active=False``.
        """
        record = await model_repository.get_active_status(db, model_id)
        if record is None:
            raise LLMModelDisabledError(f"LLM model {model_id} not found")
        if not record.active:
            raise LLMModelDisabledError(f"LLM model '{record.openrouter_id}' (id={model_id}) is disabled")

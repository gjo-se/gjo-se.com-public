"""FastAPI router for admin model catalog operations.

Admin routes:
    GET    /admin/core/llm/models
    GET    /admin/core/llm/models/count
    POST   /admin/core/llm/models/sync
    PATCH  /admin/core/llm/models/{id}
    GET    /admin/core/llm/models/{id}/price-history
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies import llm_gateway_dependencies as llm_deps
from app.shared.llm_gateway.domain.model_contract import ModelFilter
from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.schemas.model_schemas import (
    LLMModelPatchExtendedIn,
    LLMModelPriceSnapshotResponse,
    LLMModelResponse,
    LLMSyncResultOut,
    ModelListCountResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

models_router = APIRouter()

# Shared query parameter descriptions
_PARAM_Q = Query(default=None, description="Search in display_name, openrouter_id (ILIKE)")
_PARAM_PROVIDER_ID = Query(default=None, description="Filter by provider id")
_PARAM_SUPPORTS_STRUCTURED_OUTPUT = Query(default=None, description="Filter: supports structured output")
_PARAM_MODALITY = Query(default=None, description="Filter: architecture modality (ILIKE), e.g. 'text+image'")
_PARAM_INPUT_MODALITY = Query(default=None, description="Filter: input modality (JSONB contains), e.g. 'image'")
_PARAM_OUTPUT_MODALITY = Query(default=None, description="Filter: output modality (JSONB contains), e.g. 'text'")
_PARAM_REASONING = Query(default=None, description="Filter: reasoning capability (mandatory=true)")
_PARAM_IS_ACTIVE = Query(default=None, description="Filter: active status (true/false/None=all)")
_PARAM_PRICE_MIN = Query(default=None, ge=0, description="Filter: minimum price per 1M input tokens")
_PARAM_PRICE_MAX = Query(default=None, ge=0, description="Filter: maximum price per 1M input tokens")
_PARAM_SORT_BY = Query(
    default=None,
    description=(
        "Sort column: display_name, openrouter_id, context_window, max_completion_tokens, created, knowledge_cutoff"
    ),
)
_PARAM_SORT_ORDER = Query(default=None, description="Sort direction: asc, desc")
_PARAM_OFFSET = Query(default=0, ge=0, description="Pagination offset")
_PARAM_LIMIT = Query(default=50, ge=1, le=500, description="Pagination limit")


@models_router.get(
    "/models",
    response_model=list[LLMModelResponse],
    summary="[Admin] List models (server-side filters, sort, pagination)",
)
async def list_models(
    _admin: AdminUser,
    provider_id: int | None = _PARAM_PROVIDER_ID,
    q: str | None = _PARAM_Q,
    supports_structured_output: bool | None = _PARAM_SUPPORTS_STRUCTURED_OUTPUT,
    modality: str | None = _PARAM_MODALITY,
    input_modality: str | None = _PARAM_INPUT_MODALITY,
    output_modality: str | None = _PARAM_OUTPUT_MODALITY,
    reasoning: bool | None = _PARAM_REASONING,
    is_active: bool | None = _PARAM_IS_ACTIVE,
    price_min: float | None = _PARAM_PRICE_MIN,
    price_max: float | None = _PARAM_PRICE_MAX,
    sort_by: str | None = _PARAM_SORT_BY,
    sort_order: str | None = _PARAM_SORT_ORDER,
    offset: int = _PARAM_OFFSET,
    limit: int = _PARAM_LIMIT,
    db: AsyncSession = Depends(get_db),
) -> list[LLMModelResponse]:
    """Return paginated model catalog entries with SQL-level filtering.

    All filter parameters are optional. Pagination via offset/limit.
    """
    return await llm_deps.get_llm_model_service().list_all(
        db,
        ModelFilter(
            provider_id=provider_id,
            q=q,
            supports_structured_output=supports_structured_output,
            modality=modality,
            input_modality=input_modality,
            output_modality=output_modality,
            reasoning=reasoning,
            is_active=is_active,
            price_min=price_min,
            price_max=price_max,
        ),
        sort_by=sort_by,
        sort_order=sort_order,
        offset=offset,
        limit=limit,
    )


@models_router.get(
    "/models/count",
    response_model=ModelListCountResponse,
    summary="[Admin] Count models matching filters",
)
async def count_models(
    _admin: AdminUser,
    provider_id: int | None = _PARAM_PROVIDER_ID,
    q: str | None = _PARAM_Q,
    supports_structured_output: bool | None = _PARAM_SUPPORTS_STRUCTURED_OUTPUT,
    modality: str | None = _PARAM_MODALITY,
    input_modality: str | None = _PARAM_INPUT_MODALITY,
    output_modality: str | None = _PARAM_OUTPUT_MODALITY,
    reasoning: bool | None = _PARAM_REASONING,
    is_active: bool | None = _PARAM_IS_ACTIVE,
    price_min: float | None = _PARAM_PRICE_MIN,
    price_max: float | None = _PARAM_PRICE_MAX,
    db: AsyncSession = Depends(get_db),
) -> ModelListCountResponse:
    """Return count of models matching the given filters."""
    total = await llm_deps.get_llm_model_service().count(
        db,
        ModelFilter(
            provider_id=provider_id,
            q=q,
            supports_structured_output=supports_structured_output,
            modality=modality,
            input_modality=input_modality,
            output_modality=output_modality,
            reasoning=reasoning,
            is_active=is_active,
            price_min=price_min,
            price_max=price_max,
        ),
    )
    return ModelListCountResponse(total=total)


@models_router.get(
    "/models/{model_id}",
    response_model=LLMModelResponse,
    summary="[Admin] Get single model by ID",
)
async def get_model(
    _admin: AdminUser,
    model_id: int,
    db: AsyncSession = Depends(get_db),
) -> LLMModelResponse:
    """Return a single model record by its primary key."""
    result = await llm_deps.get_llm_model_service().get_by_id(db, model_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return result


@models_router.post(
    "/models/sync",
    response_model=LLMSyncResultOut,
    summary="[Admin] Sync models from OpenRouter",
)
async def sync_models(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> LLMSyncResultOut:
    """Fetch all models from OpenRouter and upsert into the local catalog.

    Args:
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        LLMSyncResultOut with counts of affected rows.
    """
    return await llm_deps.get_llm_model_sync_service().sync_from_openrouter(db)


@models_router.patch(
    "/models/{model_id}",
    response_model=LLMModelResponse,
    summary="[Admin] Patch model (extended: active, task_type, task_tags)",
)
async def patch_model(
    model_id: int,
    body: LLMModelPatchExtendedIn,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> LLMModelResponse:
    """Update mutable fields of an LLM model.

    Supports both legacy fields (active, is_locally_installed) and new fields
    (task_type, task_tags).

    Args:
        model_id: PK of the model to update.
        body: Patch payload (active, is_locally_installed, task_type, task_tags).
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        Updated LLMModelResponse.

    Raises:
        HTTPException 404: Model not found.
        HTTPException 400: Invalid task_type or task_tags.
    """
    model = await db.get(LLMModel, model_id)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    # Update legacy fields if provided
    if body.active is not None:
        model.active = body.active
    if body.is_locally_installed is not None:
        model.is_locally_installed = body.is_locally_installed

    # Update new benchmark fields if provided
    if body.task_type is not None:
        model.task_type = body.task_type
    if body.task_tags is not None:
        model.task_tags = body.task_tags

    db.add(model)
    await db.commit()

    # Use model_service.list_all to build proper response with JOINs
    all_models = await llm_deps.get_llm_model_service().list_all(db, ModelFilter())
    updated = next((m for m in all_models if m.id == model_id), None)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model could not be retrieved after update",
        )
    return updated


@models_router.get(
    "/models/{model_id}/price-history",
    response_model=list[LLMModelPriceSnapshotResponse],
    summary="[Admin] Get price history for a model",
)
async def get_price_history(
    model_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> list[LLMModelPriceSnapshotResponse]:
    """Return all price snapshots for a model in chronological order.

    Args:
        model_id: PK of the model.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        List of LLMModelPriceSnapshotResponse (oldest first).
    """
    return await llm_deps.get_llm_model_service().get_price_history(db, model_id)

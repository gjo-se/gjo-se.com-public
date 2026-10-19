"""FastAPI router for unified model configuration (admin-only).

Routes:
    POST   /admin/core/llm/model-config/{task}       – Create model config
    GET    /admin/core/llm/model-config/{task}       – List all configs for a task
    PATCH  /admin/core/llm/model-config/{id}          – Partial update
    DELETE /admin/core/llm/model-config/{id}          – Delete config
"""

from __future__ import annotations

from dataclasses import dataclass

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_model_config_service
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.schemas.model_config_schemas import (
    ModelConfigCreate,
    ModelConfigResponse,
    ModelConfigUpdate,
)
from app.shared.llm_gateway.services.model_config_service import ModelConfigService
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/model-config", tags=["llm · model-config · admin"])


@dataclass
class ModelConfigRow:
    """Read-Model: ORM-Model-Config + per Join aufgelöste Status-Felder.

    Trägt ``status``/``status_color_token`` explizit, statt sie als dynamische
    Runtime-Attribute an die ORM-Entity zu hängen (ORM = Schreibmodell,
    Read-Model = Projektion).
    """

    config: TaskModelConfigRecord
    status: str | None = None
    status_color_token: str | None = None


def _to_response(row: ModelConfigRow) -> ModelConfigResponse:
    """Maps a model-config read-model to the API response schema."""
    config = row.config
    return ModelConfigResponse(
        id=config.id,
        task=config.task,
        model_id=config.model_id,
        credential_id=config.credential_id,
        hyperparameters=config.hyperparameters,
        is_production=config.is_production,
        is_fallback=config.is_fallback,
        is_eval=config.is_eval,
        created_at=config.created_at,
        updated_at=config.updated_at,
        status=row.status,
        status_color_token=row.status_color_token,
        model_display_name=config.model_display_name,
        provider_name=config.provider_name,
        credential_label=config.credential_label,
    )


async def _resolve_model_config_statuses(
    configs: list[TaskModelConfigRecord],
) -> list[ModelConfigRow]:
    """Batch-resolve core_status for llm_task_model_config from gjo_se_com.

    ``is_active`` was migrated to ``core_statusable`` (#1820); this returns a
    read-model carrying the resolved status name + color token so the response
    schema is built explicitly (ORM = Schreibmodell, Read-Model = Projektion).
    """
    status_map: dict[int, tuple[str | None, str | None]] = {}
    ids = [c.id for c in configs]
    if ids:
        try:
            from app.shared.db_access.session import AsyncSessionLocal
            from app.shared.status.repositories import statusable_repository

            async with AsyncSessionLocal() as gjo_db:
                status_map = await statusable_repository.resolve_status_map(gjo_db, "llm_task_model_config", ids)
        except Exception:
            logger.exception(
                "Failed to resolve llm_task_model_config statuses",
            )

    result: list[ModelConfigRow] = []
    for config in configs:
        entry = status_map.get(config.id)
        result.append(
            ModelConfigRow(
                config=config,
                status=entry[0] if entry else None,
                status_color_token=entry[1] if entry else None,
            )
        )
    return result


@router.post(
    "/{task}",
    response_model=ModelConfigResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_model_config(
    task: str,
    _admin: AdminUser,
    data: ModelConfigCreate,
    service: ModelConfigService = Depends(get_model_config_service),
) -> ModelConfigResponse:
    """Create a new model configuration for a task–model pair.

    The *task* must exist in ``TASK_REGISTRY``.
    ``is_production`` and ``is_fallback`` are mutually exclusive.
    """
    try:
        config = await service.create(task, data)
    except ValueError as exc:
        detail = str(exc)
        if "existiert bereits" in detail or "production" in detail.lower() or "fallback" in detail.lower():
            code = status.HTTP_409_CONFLICT
        elif "Unbekannter Task" in detail or "nicht gefunden" in detail:
            code = status.HTTP_400_BAD_REQUEST
        elif "mutually exclusive" in detail.lower():
            code = status.HTTP_409_CONFLICT
        else:
            code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=detail) from exc
    rows = await _resolve_model_config_statuses([config])
    return _to_response(rows[0])


@router.get(
    "/{task}",
    response_model=list[ModelConfigResponse],
)
async def list_model_configs(
    task: str,
    _admin: AdminUser,
    service: ModelConfigService = Depends(get_model_config_service),
) -> list[ModelConfigResponse]:
    """Return all model configurations for a given task, production first."""
    configs = await service.list_by_task(task)
    rows = await _resolve_model_config_statuses(configs)
    return [_to_response(row) for row in rows]


@router.patch(
    "/{config_id}",
    response_model=ModelConfigResponse,
)
async def update_model_config(
    config_id: int,
    _admin: AdminUser,
    data: ModelConfigUpdate,
    service: ModelConfigService = Depends(get_model_config_service),
) -> ModelConfigResponse:
    """Partially update a model configuration. Only provided fields are changed."""
    try:
        config = await service.update(config_id, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "nicht gefunden" in str(exc) else status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Constraint violation – duplicate or conflicting flags.",
        ) from exc
    rows = await _resolve_model_config_statuses([config])
    return _to_response(rows[0])


@router.delete(
    "/{config_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_model_config(
    config_id: int,
    _admin: AdminUser,
    service: ModelConfigService = Depends(get_model_config_service),
) -> None:
    """Delete a model configuration by ID."""
    try:
        await service.delete(config_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

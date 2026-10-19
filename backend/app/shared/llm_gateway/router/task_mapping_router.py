"""Task mapping management routes (admin-only): validators + upsert."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.credential_store.models.admin_credential import AdminCredential
from app.shared.db_access.session import get_db
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.task_model_config import TaskModelConfig
from app.shared.llm_gateway.schemas.task_schemas import (
    PlaceholderResponse,
    TaskMappingResponse,
    TaskMappingUpsertIn,
    TaskWithMappingResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


async def _validate_model(db: AsyncSession, model_id: int) -> LLMModel:
    """Validate that a model exists and is active.

    Args:
        db: Async database session.
        model_id: Model ID to validate.

    Returns:
        The LLMModel if valid.

    Raises:
        HTTPException 404: Model not found or inactive.
    """
    row = await db.scalar(
        select(LLMModel).where(LLMModel.id == model_id),
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM model with id {model_id} not found.",
        )
    if not row.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"LLM model with id {model_id} is not active.",
        )
    return row


async def _validate_credential(db: AsyncSession, credential_id: int) -> AdminCredential:
    """Validate that a credential exists and is of type 'llm'.

    Args:
        db: Async database session.
        credential_id: Credential ID to validate.

    Returns:
        The AdminCredential if valid.

    Raises:
        HTTPException 404: Credential not found or wrong type.
    """
    row = await db.scalar(
        select(AdminCredential).where(AdminCredential.id == credential_id),
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Admin credential with id {credential_id} not found.",
        )
    if row.source_type != "llm":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Admin credential with id {credential_id} is not an LLM credential.",
        )
    return row


@router.put(
    "/task-mappings/{task}",
    response_model=TaskWithMappingResponse,
    summary="[Admin] Create or update a task mapping",
)
async def upsert_task_mapping(
    task: str,
    body: TaskMappingUpsertIn,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> TaskWithMappingResponse:
    """Assign a model and credential to a task.

    Creates a new ``TaskModelConfig`` row (``is_production=True``) or
    updates an existing one for the given ``task``.

    Validates:
    - ``model_id`` exists and is active
    - ``credential_id`` exists and has ``source_type='llm'`` (if set)

    Args:
        task: Task key from the registry.
        body: Upsert payload with model_id, credential_id, active.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        TaskWithMappingResponse with the updated mapping.

    Raises:
        HTTPException 404: Unknown task or invalid model/credential.
    """
    if task not in TASK_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown task: '{task}'",
        )

    if body.model_id is not None:
        await _validate_model(db, body.model_id)

    if body.credential_id is not None:
        await _validate_credential(db, body.credential_id)

    # Find existing production config or create new
    existing = await db.scalar(
        select(TaskModelConfig).where(
            TaskModelConfig.task == task,
            TaskModelConfig.is_production == True,  # noqa: E712
        )
    )

    if existing is None:
        config = TaskModelConfig(
            task=task,
            model_id=body.model_id,
            credential_id=body.credential_id,
            is_production=True,
        )
        db.add(config)
        config_to_return = config
    else:
        if body.model_id is not None:
            existing.model_id = body.model_id
        existing.credential_id = body.credential_id
        config_to_return = existing

    await db.commit()

    # Reload with relationships for response
    await db.refresh(config_to_return, ["model", "credential"])

    mapping = TaskMappingResponse(
        id=config_to_return.id,
        model_id=config_to_return.model_id,
        model_display_name=config_to_return.model.display_name if config_to_return.model else None,
        credential_id=config_to_return.credential_id,
        credential_label=config_to_return.credential.label if config_to_return.credential else None,
        credential_portal=config_to_return.credential.portal if config_to_return.credential else None,
        credential_provider=config_to_return.credential.provider if config_to_return.credential else None,
    )
    definition = TASK_REGISTRY[task]
    return TaskWithMappingResponse(
        key=task,
        display_name=definition.display_name,
        description=definition.description,
        allowed_triggers=[t.value for t in definition.allowed_triggers],
        placeholders=[
            PlaceholderResponse(
                key=p.key,
                label=p.label,
                description=p.description,
                category=p.category,
            )
            for p in definition.placeholders
        ],
        mapping=mapping,
        active_prompt_version=None,
    )

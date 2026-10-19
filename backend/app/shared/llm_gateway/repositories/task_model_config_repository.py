"""Database access for LLM task-model configurations (llm_gateway).

Read/write operations return :class:`TaskModelConfigRecord` domain objects
(never ORM models) so the service layer stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``). The repository also owns the ``IntegrityError`` → ``ValueError``
translation for the partial unique indexes.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.task_model_config import TaskModelConfig
from app.shared.llm_gateway.schemas.model_config_schemas import ModelConfigCreate, ModelConfigUpdate


def _eager() -> tuple[Any, ...]:
    """Builds the eager-load options lazily (after all ORM models are registered)."""
    return (
        selectinload(TaskModelConfig.model).selectinload(LLMModel.provider),
        selectinload(TaskModelConfig.credential),
    )


def _to_record(row: TaskModelConfig) -> TaskModelConfigRecord:
    """Maps a ``TaskModelConfig`` ORM row (with eager joins) to its domain record."""
    return TaskModelConfigRecord(
        id=row.id,
        task=row.task,
        model_id=row.model_id,
        credential_id=row.credential_id,
        hyperparameters=row.hyperparameters,
        is_production=row.is_production,
        is_fallback=row.is_fallback,
        is_eval=row.is_eval,
        is_judge=row.is_judge,
        created_at=row.created_at,
        updated_at=row.updated_at,
        model_display_name=row.model_display_name,
        provider_name=row.provider_name,
        credential_label=row.credential_label,
    )


async def get_by_id(db: AsyncSession, config_id: int) -> TaskModelConfigRecord | None:
    """Returns a single config by id as a record, or ``None``."""
    result = await db.execute(select(TaskModelConfig).options(*_eager()).where(TaskModelConfig.id == config_id))
    row = result.scalar_one_or_none()
    return _to_record(row) if row is not None else None


async def list_by_task(db: AsyncSession, task: str) -> list[TaskModelConfigRecord]:
    """Returns all model configs for a task, production first, as records."""
    stmt = (
        select(TaskModelConfig)
        .options(*_eager())
        .where(TaskModelConfig.task == task)
        .order_by(
            TaskModelConfig.is_production.desc(),
            TaskModelConfig.created_at.desc(),
        )
    )
    result = await db.execute(stmt)
    return [_to_record(row) for row in result.scalars().all()]


async def create(db: AsyncSession, task: str, data: ModelConfigCreate) -> TaskModelConfigRecord:
    """Persists a new model config, translating constraint violations to ``ValueError``.

    Raises:
        ValueError: A partial unique index or the XOR check constraint is violated.
    """
    config = TaskModelConfig(
        task=task,
        model_id=data.model_id,
        credential_id=data.credential_id,
        hyperparameters=data.hyperparameters,
        is_production=data.is_production,
        is_fallback=data.is_fallback,
        is_eval=True,
    )
    db.add(config)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        detail = str(exc.orig) if exc.orig else str(exc)
        if "uq_task_model_config" in detail:
            raise ValueError(
                f"Model-Config für Task '{task}' mit model_id={data.model_id} "
                f"existiert bereits (Unique Constraint: task + model_id).",
            ) from None
        if "ix_task_production" in detail:
            raise ValueError(
                f"Task '{task}' hat bereits eine Production-Config. Bitte zuerst die bestehende deaktivieren.",
            ) from None
        if "ix_task_fallback" in detail:
            raise ValueError(
                f"Task '{task}' hat bereits eine Fallback-Config. Bitte zuerst die bestehende deaktivieren.",
            ) from None
        if "ck_production_xor_fallback" in detail:
            raise ValueError("production and fallback are mutually exclusive.") from None
        raise
    await db.refresh(config)
    return _to_record(config)


async def update(db: AsyncSession, config_id: int, data: ModelConfigUpdate) -> TaskModelConfigRecord:
    """Applies only the explicitly provided fields of a config.

    Raises:
        ValueError: The config does not exist, or a constraint is violated.
    """
    config = await _get_or_404(db, config_id)

    for field in (
        "model_id",
        "credential_id",
        "hyperparameters",
        "is_production",
        "is_fallback",
        "is_eval",
    ):
        value = getattr(data, field, None)
        if value is not None:
            setattr(config, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        detail = str(exc.orig) if exc.orig else str(exc)
        if "ix_task_production" in detail:
            raise ValueError(f"Task '{config.task}' hat bereits eine Production-Config.") from None
        if "ix_task_fallback" in detail:
            raise ValueError(f"Task '{config.task}' hat bereits eine Fallback-Config.") from None
        if "ck_production_xor_fallback" in detail:
            raise ValueError("production and fallback are mutually exclusive.") from None
        raise
    await db.refresh(config)
    return _to_record(config)


async def delete(db: AsyncSession, config_id: int) -> None:
    """Deletes a config by id.

    Raises:
        ValueError: No config with this id exists.
    """
    config = await _get_or_404(db, config_id)
    await db.delete(config)
    await db.commit()


async def get_production(db: AsyncSession, task: str) -> TaskModelConfigRecord | None:
    """Returns the active production config for a task, or ``None``."""
    stmt = (
        select(TaskModelConfig)
        .options(*_eager())
        .where(
            TaskModelConfig.task == task,
            TaskModelConfig.is_production.is_(True),
        )
    )
    result = await db.execute(stmt)
    return _as_optional(result.scalar_one_or_none())


async def get_fallback(db: AsyncSession, task: str) -> TaskModelConfigRecord | None:
    """Returns the active fallback config for a task, or ``None``."""
    stmt = (
        select(TaskModelConfig)
        .options(*_eager())
        .where(
            TaskModelConfig.task == task,
            TaskModelConfig.is_fallback.is_(True),
        )
    )
    result = await db.execute(stmt)
    return _as_optional(result.scalar_one_or_none())


async def list_eval_configs(db: AsyncSession, task: str) -> list[TaskModelConfigRecord]:
    """Returns all configs for a task, newest first, as records."""
    stmt = (
        select(TaskModelConfig)
        .options(*_eager())
        .where(TaskModelConfig.task == task)
        .order_by(TaskModelConfig.created_at.desc())
    )
    result = await db.execute(stmt)
    return [_to_record(row) for row in result.scalars().all()]


def _as_optional(row: TaskModelConfig | None) -> TaskModelConfigRecord | None:
    """Maps an optional ORM row to an optional record."""
    return _to_record(row) if row is not None else None


async def _get_or_404(db: AsyncSession, config_id: int) -> TaskModelConfig:
    """Fetches the ORM config by id or raises ``ValueError``."""
    config = await db.get(TaskModelConfig, config_id)
    if config is None:
        raise ValueError(f"Model-Config nicht gefunden: {config_id}")
    return config

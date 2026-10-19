"""Database access for the LLM model catalog (llm_gateway).

Reads return :class:`ModelRecord` / :class:`PriceSnapshotRecord` /
:class:`ModelActiveRecord` domain objects (never ORM models) so the service
layer stays free of ``app.shared.llm_gateway.models`` imports (Achse 2:
``services`` > ``repositories``). The ``AsyncSession`` is passed in by the
caller (K3); the only own session opened here is the cross-database core-status
resolution.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime
from decimal import Decimal
from typing import Any

import structlog
from sqlalchemy import Row, Select, and_, cast, func, or_, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.shared.llm_gateway.domain.model_contract import (
    ModelActiveRecord,
    ModelFilter,
    ModelIdentityRecord,
    ModelRecord,
    PriceSnapshotRecord,
)
from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.price_snapshot import LLMModelPriceSnapshot
from app.shared.llm_gateway.repositories.model_query_repository import _apply_sorting, _build_base_query

logger = structlog.get_logger(__name__)


def _modality_conditions(
    modality: str | None,
    input_modality: str | None,
    output_modality: str | None,
) -> list[ColumnElement[bool]]:
    """Build the modality / input- / output-modality JSONB filter conditions."""
    conditions: list[ColumnElement[bool]] = []
    if modality is not None:
        conditions.append(cast(LLMModel.architecture, JSONB)["modality"].astext.ilike(f"%{modality}%"))
    if input_modality is not None:
        conditions.append(
            cast(LLMModel.architecture, JSONB)["input_modalities"].op("?", is_comparison=True)(input_modality)
        )
    if output_modality is not None:
        conditions.append(
            cast(LLMModel.architecture, JSONB)["output_modalities"].op("?", is_comparison=True)(output_modality)
        )
    return conditions


def _price_condition(price_min: float | None, price_max: float | None) -> ColumnElement[bool] | None:
    """Build the latest-price comparison condition (correlated subquery), if any bound is set."""
    if price_min is None and price_max is None:
        return None
    price_sub = (
        select(LLMModelPriceSnapshot.price_input)
        .where(LLMModelPriceSnapshot.model_id == LLMModel.id)
        .order_by(LLMModelPriceSnapshot.synced_at.desc())
        .limit(1)
        .correlate(LLMModel)
        .scalar_subquery()
    )
    if price_min is not None and price_max is not None:
        return and_(price_sub >= price_min, price_sub <= price_max)
    if price_min is not None:
        return price_sub >= price_min
    return price_sub <= price_max


def _apply_filters(
    stmt: Select[tuple[LLMModel, str, str]] | Select[tuple[int]],
    filters: ModelFilter,
) -> Select[Any]:
    """Apply all filter WHERE clauses to the statement."""
    conditions: list[ColumnElement[bool]] = []

    if filters.provider_id is not None:
        conditions.append(LLMModel.provider_id == filters.provider_id)

    if filters.q:
        pattern = f"%{filters.q}%"
        conditions.append(
            or_(
                LLMModel.display_name.ilike(pattern),
                LLMModel.openrouter_id.ilike(pattern),
            )
        )

    if filters.supports_structured_output is True:
        conditions.append(cast(LLMModel.supported_parameters, JSONB).contains(["structured_outputs"]))
    elif filters.supports_structured_output is False:
        conditions.append(
            or_(
                LLMModel.supported_parameters.is_(None),
                ~cast(LLMModel.supported_parameters, JSONB).contains(["structured_outputs"]),
            )
        )

    conditions.extend(_modality_conditions(filters.modality, filters.input_modality, filters.output_modality))

    if filters.reasoning is True:
        conditions.append(LLMModel.reasoning.is_not(None))
    elif filters.reasoning is False:
        conditions.append(LLMModel.reasoning.is_(None))

    if filters.is_active is not None:
        conditions.append(LLMModel.active == filters.is_active)

    price_condition = _price_condition(filters.price_min, filters.price_max)
    if price_condition is not None:
        conditions.append(price_condition)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    return stmt


def _to_record(
    model: LLMModel,
    provider_name: str,
    provider_display_name: str,
    price_input: Decimal | None,
    price_output: Decimal | None,
) -> ModelRecord:
    """Maps a model ORM row (with provider + latest price) to its domain record."""
    return ModelRecord(
        id=model.id,
        openrouter_id=model.openrouter_id,
        native_model_id=model.native_model_id,
        provider_id=model.provider_id,
        provider_name=provider_name,
        provider_display_name=provider_display_name,
        display_name=model.display_name,
        description=model.description,
        context_window=model.context_window,
        active=model.active,
        price_input=price_input,
        price_output=price_output,
        first_seen_at=model.first_seen_at,
        last_seen_at=model.last_seen_at,
        supported_parameters=model.supported_parameters,
        architecture=model.architecture,
        reasoning=model.reasoning,
        default_parameters=model.default_parameters,
        top_provider=model.top_provider,
        max_completion_tokens=model.max_completion_tokens,
        knowledge_cutoff=model.knowledge_cutoff,
        hugging_face_id=model.hugging_face_id,
        created=model.created,
        canonical_slug=model.canonical_slug,
        is_locally_installed=model.is_locally_installed,
        task_type=model.task_type,
        task_tags=model.task_tags,
    )


async def _latest_price(db: AsyncSession, model_id: int) -> tuple[Decimal | None, Decimal | None]:
    """Returns the newest ``(price_input, price_output)`` for *model_id*."""
    snapshot = await db.scalar(
        select(LLMModelPriceSnapshot)
        .where(LLMModelPriceSnapshot.model_id == model_id)
        .order_by(LLMModelPriceSnapshot.synced_at.desc())
        .limit(1)
    )
    if snapshot is None:
        return None, None
    return snapshot.price_input, snapshot.price_output


async def _rows_to_records(
    db: AsyncSession,
    rows: list[Row[tuple[LLMModel, str, str]]],
) -> list[ModelRecord]:
    """Maps query rows to model records, attaching latest price + core status."""
    records: list[ModelRecord] = []
    for row in rows:
        model: LLMModel = row[0]
        price_input, price_output = await _latest_price(db, model.id)
        records.append(_to_record(model, row[1], row[2], price_input, price_output))

    status_map = await resolve_statuses([r.id for r in records])
    return [
        replace(
            record,
            status=status_map[record.id][0] if record.id in status_map else None,
            status_color_token=status_map[record.id][1] if record.id in status_map else None,
        )
        for record in records
    ]


async def resolve_statuses(ids: list[int]) -> dict[int, tuple[str, str]]:
    """Batch-resolve core_status for llm_model entries from the gjo_se_com DB.

    Opens its own session (cross-database) and returns a mapping of
    ``model_id -> (status_name, color_token)``.
    """
    if not ids:
        return {}

    from app.shared.db_access.session import AsyncSessionLocal as _gjo_session
    from app.shared.status.models.status import Status, Statusable

    try:
        async with _gjo_session() as gjo_db:
            stmt = (
                select(Statusable.statusable_id, Status.name, Status.color_token)
                .join(Status, Status.id == Statusable.status_id)
                .where(
                    Statusable.statusable_type == "llm_model",
                    Statusable.statusable_id.in_(ids),
                )
            )
            rows = (await gjo_db.execute(stmt)).all()
    except Exception:
        logger.exception("Failed to resolve llm_model statuses")
        return {}

    return {row[0]: (row[1], row[2]) for row in rows}


async def list_models(
    db: AsyncSession,
    filters: ModelFilter,
    *,
    sort_by: str | None = None,
    sort_order: str | None = None,
    offset: int = 0,
    limit: int = 50,
) -> list[ModelRecord]:
    """Returns models with SQL-level filtering, sorting, and pagination."""
    stmt = _build_base_query()
    stmt = _apply_filters(stmt, filters)
    stmt = _apply_sorting(stmt, sort_by, sort_order)
    stmt = stmt.offset(offset).limit(limit)

    rows = (await db.execute(stmt)).all()
    return await _rows_to_records(db, list(rows))


async def get_by_id(db: AsyncSession, model_id: int) -> ModelRecord | None:
    """Returns a single model record by PK, or ``None``."""
    stmt = _build_base_query().where(LLMModel.id == model_id)
    row = (await db.execute(stmt)).first()
    if row is None:
        return None
    records = await _rows_to_records(db, [row])
    return records[0]


async def count(db: AsyncSession, filters: ModelFilter) -> int:
    """Returns the number of models matching *filters*."""
    stmt = select(func.count()).select_from(LLMModel)
    stmt = _apply_filters(stmt, filters)
    return (await db.scalar(stmt)) or 0


async def update_flags(
    db: AsyncSession,
    model_id: int,
    *,
    active: bool | None,
    is_locally_installed: bool | None,
) -> bool:
    """Applies the non-None flags to the model row; returns ``False`` if absent."""
    model = await db.scalar(select(LLMModel).where(LLMModel.id == model_id))
    if model is None:
        return False
    if active is not None:
        model.active = active
    if is_locally_installed is not None:
        model.is_locally_installed = is_locally_installed
    await db.commit()
    return True


async def get_active_status(db: AsyncSession, model_id: int) -> ModelActiveRecord | None:
    """Returns the ``(openrouter_id, active)`` snapshot for a model, or ``None``."""
    model = await db.scalar(select(LLMModel).where(LLMModel.id == model_id))
    if model is None:
        return None
    return ModelActiveRecord(openrouter_id=model.openrouter_id, active=model.active)


async def get_price_history(db: AsyncSession, model_id: int) -> list[PriceSnapshotRecord]:
    """Returns all price snapshots for a model in chronological order."""
    stmt = (
        select(LLMModelPriceSnapshot)
        .where(LLMModelPriceSnapshot.model_id == model_id)
        .order_by(LLMModelPriceSnapshot.synced_at.asc())
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return [
        PriceSnapshotRecord(
            id=snap.id,
            model_id=snap.model_id,
            price_input=snap.price_input,
            price_output=snap.price_output,
            source=snap.source,
            synced_at=snap.synced_at,
        )
        for snap in rows
    ]


async def get_identity(db: AsyncSession, model_id: int) -> ModelIdentityRecord | None:
    """Returns the minimal ``(openrouter_id, native_model_id, provider_id)`` snapshot.

    Args:
        db: Active async database session.
        model_id: Primary key of the model row.

    Returns:
        A :class:`ModelIdentityRecord`, or ``None`` when the model is absent.
    """
    model = await db.scalar(select(LLMModel).where(LLMModel.id == model_id))
    if model is None:
        return None
    return ModelIdentityRecord(
        id=model.id,
        openrouter_id=model.openrouter_id,
        native_model_id=model.native_model_id,
        provider_id=model.provider_id,
    )


async def add_price_snapshot(
    db: AsyncSession,
    *,
    model_id: int,
    price_input: Decimal,
    price_output: Decimal,
    source: str,
    synced_at: datetime,
) -> None:
    """Append a new price snapshot for *model_id* (existing snapshots are immutable).

    Args:
        db: Active async database session.
        model_id: FK to the model row.
        price_input: Price per 1M input tokens.
        price_output: Price per 1M output tokens.
        source: Data source identifier.
        synced_at: Timestamp when recorded.
    """
    db.add(
        LLMModelPriceSnapshot(
            model_id=model_id,
            price_input=price_input,
            price_output=price_output,
            source=source,
            synced_at=synced_at,
        )
    )

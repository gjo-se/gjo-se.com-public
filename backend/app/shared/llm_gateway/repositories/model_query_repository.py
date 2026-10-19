"""Statement construction for the LLM model catalog (llm_gateway).

Builds the base ``SELECT`` (``LLMModel`` ⋈ ``LLMProvider``), the sortable-column
whitelist and the ``ORDER BY`` clause used by the read path. Split out of
``model_repository`` so that module stays cohesive (LCOM4): statement
construction shares no collaborator with the session-bound row access. Pure
SQLAlchemy – no session is opened here (K3).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Select, select

from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.price_snapshot import LLMModelPriceSnapshot
from app.shared.llm_gateway.models.provider import LLMProvider

# Whitelist: frontend sort key → SQLAlchemy column
_SORTABLE_COLUMNS: dict[str, Any] = {
    "id": LLMModel.id,
    "display_name": LLMModel.display_name,
    "openrouter_id": LLMModel.openrouter_id,
    "context_window": LLMModel.context_window,
    "max_completion_tokens": LLMModel.max_completion_tokens,
    "created": LLMModel.created,
    "knowledge_cutoff": LLMModel.knowledge_cutoff,
}


def _build_base_query() -> Select[tuple[LLMModel, str, str]]:
    """Build the base query joining LLMModel + LLMProvider."""
    return select(LLMModel, LLMProvider.name, LLMProvider.display_name).join(
        LLMProvider, LLMModel.provider_id == LLMProvider.id
    )


def _apply_sorting(
    stmt: Select[tuple[LLMModel, str, str]],
    sort_by: str | None,
    sort_order: str | None,
) -> Select[tuple[LLMModel, str, str]]:
    """Apply ORDER BY with whitelist validation.

    Special case: ``price_input`` joins the latest price snapshot and sorts by it.
    """
    if sort_by == "price_input":
        price_sub = (
            select(LLMModelPriceSnapshot.price_input)
            .where(LLMModelPriceSnapshot.model_id == LLMModel.id)
            .order_by(LLMModelPriceSnapshot.synced_at.desc())
            .limit(1)
            .correlate(LLMModel)
            .scalar_subquery()
        )
        stmt = stmt.add_columns(price_sub.label("_price_input"))
        stmt = stmt.order_by(price_sub.desc()) if sort_order == "desc" else stmt.order_by(price_sub.asc())
    else:
        column = _SORTABLE_COLUMNS.get(sort_by or "") if sort_by else None
        if column is not None:
            stmt = stmt.order_by(column.desc()) if sort_order == "desc" else stmt.order_by(column.asc())
        else:
            stmt = stmt.order_by(LLMModel.display_name.asc())
    return stmt

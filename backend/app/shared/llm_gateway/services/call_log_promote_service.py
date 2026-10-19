"""Service to promote an LLM call log entry to a LangFuse dataset.

Handles auto-label validation, duplicate detection via embedding similarity,
and writing to LangFuse Datasets for the closed feedback loop (Golden/Failure).
The call-log DB access lives in :mod:`...repositories.call_log_repository`.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.domain.embedding_consumer_contract import EmbeddingClientConsumer
from app.shared.embedding.domain.similarity_rules import cosine_similarity
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.llm_gateway.domain.call_log_contract import CallLogRecord
from app.shared.llm_gateway.langfuse_client import get_langfuse_client
from app.shared.llm_gateway.repositories import call_log_repository
from app.shared.llm_gateway.schemas.task_schemas import PromoteToDatasetResponse

if TYPE_CHECKING:
    from langfuse import Langfuse

logger = structlog.get_logger(__name__)

_DUPLICATE_SIMILARITY_THRESHOLD = 0.95


def _rejected(message: str, *validation_errors: str) -> PromoteToDatasetResponse:
    """Build a ``rejected`` :class:`PromoteToDatasetResponse`."""
    return PromoteToDatasetResponse(
        status="rejected",
        message=message,
        validation_errors=list(validation_errors),
    )


class CallLogPromoteService(EmbeddingClientConsumer[EmbeddingClient]):
    """Validates and promotes a call log to a LangFuse dataset item.

    Usage::

        from app.shared.llm_gateway.services.call_log_promote_service import (
            call_log_promote_service,
        )

        result = await call_log_promote_service.promote(db, call_log_id, "golden")
    """

    async def promote(
        self,
        db: AsyncSession,
        call_log_id: int,
        label: str,
    ) -> PromoteToDatasetResponse:
        """Validate and promote a call log to a LangFuse dataset.

        Args:
            db: Active async database session.
            call_log_id: Primary key of the call-log row to promote.
            label: ``"golden"`` or ``"failure"``.

        Returns:
            :class:`PromoteToDatasetResponse` with status and details.
        """
        # ── Load call log ──────────────────────────────────────────────────
        call_log = await call_log_repository.get_by_id(db, call_log_id)
        if call_log is None:
            return _rejected(
                f"Call log {call_log_id} not found",
                f"CallLog with id={call_log_id} does not exist",
            )

        # ── Auto-label validation ──────────────────────────────────────────
        validation_errors = self._validate_label(call_log, label)
        if validation_errors:
            return PromoteToDatasetResponse(
                status="rejected",
                message=f"Validation failed for call_log_id={call_log_id}",
                validation_errors=validation_errors,
            )

        # ── Determine dataset name ─────────────────────────────────────────
        task_key = call_log.task or "unknown"
        dataset_name = f"{task_key}-golden" if label == "golden" else f"{task_key}-failures"

        # ── LangFuse integration ───────────────────────────────────────────
        langfuse = get_langfuse_client()
        if langfuse is None:
            return _rejected("LangFuse is not configured", "LangFuse client not available")

        self._ensure_dataset(langfuse, dataset_name)

        duplicate = await self._check_duplicate(langfuse, dataset_name, call_log, call_log_id, db)
        if duplicate is not None:
            return duplicate

        return await self._write_dataset_item(
            langfuse=langfuse,
            db=db,
            dataset_name=dataset_name,
            call_log=call_log,
            call_log_id=call_log_id,
            label=label,
        )

    def _validate_label(self, call_log: CallLogRecord, label: str) -> list[str]:
        """Return validation errors for the requested label (empty = valid)."""
        if label == "golden" and call_log.error_type is not None:
            return [f"Cannot label as golden: call has error_type={call_log.error_type}"]
        return []

    def _ensure_dataset(self, langfuse: Langfuse, dataset_name: str) -> None:
        """Ensure the LangFuse dataset exists, ignoring an already-exists failure."""
        try:
            langfuse.create_dataset(name=dataset_name)
        except Exception:
            logger.exception("Dataset '%s' already exists or creation failed", dataset_name)

    async def _check_duplicate(
        self,
        langfuse: Langfuse,
        dataset_name: str,
        call_log: CallLogRecord,
        call_log_id: int,
        db: AsyncSession,
    ) -> PromoteToDatasetResponse | None:
        """Return a ``duplicate`` response when a near-duplicate item exists."""
        try:
            existing = langfuse.get_dataset(dataset_name)
            existing_items = list(existing.items)
            if not existing_items or not call_log.input_snapshot:
                return None
            duplicate = await self._find_duplicate(db, call_log.input_snapshot, existing_items)
        except Exception:
            logger.exception("Duplicate detection skipped – dataset not accessible")
            return None

        if duplicate is None:
            return None
        return PromoteToDatasetResponse(
            status="duplicate",
            message=(
                f"Duplicate detected in dataset '{dataset_name}': similarity >= {_DUPLICATE_SIMILARITY_THRESHOLD}"
            ),
            duplicate_call_log_id=call_log_id,
        )

    async def _write_dataset_item(
        self,
        *,
        langfuse: Langfuse,
        db: AsyncSession,
        dataset_name: str,
        call_log: CallLogRecord,
        call_log_id: int,
        label: str,
    ) -> PromoteToDatasetResponse:
        """Write the dataset item, track the promotion, and map failures to rejections."""
        try:
            metadata: dict[str, Any] = {
                "call_log_id": call_log_id,
                "label": label,
                "created_by": "REX",
            }
            item = langfuse.create_dataset_item(
                dataset_name=dataset_name,
                input=call_log.input_snapshot,
                expected_output=call_log.output_snapshot,
                metadata=metadata,
            )
            item_id = getattr(item, "id", None)

            message = f"Added to dataset '{dataset_name}'"
            if label == "failure" and call_log.success is True and call_log.error_type is None:
                message += " (warning: call was successful but labelled as failure)"

            logger.info(
                "call_log_promote_service: promoted call_log_id=%d to dataset '%s' as '%s'",
                call_log_id,
                dataset_name,
                label,
            )
            await self._track_promotion(db, label, item_id, call_log_id)
            return PromoteToDatasetResponse(
                status="created",
                message=message,
                dataset_item_id=item_id,
            )
        except Exception as exc:
            logger.exception(
                "call_log_promote_service: failed to write to dataset '%s'",
                dataset_name,
            )
            return _rejected(f"Failed to write to LangFuse dataset: {exc}", str(exc))

    async def _track_promotion(
        self,
        db: AsyncSession,
        label: str,
        item_id: str | None,
        call_log_id: int,
    ) -> None:
        """Persist the promotion-tracking fields on the DB row (log-and-continue)."""
        try:
            await call_log_repository.set_promotion(
                db,
                call_log_id,
                promoted_at=datetime.now(UTC),
                promoted_to=label,
                dataset_item_id=item_id,
            )
        except Exception:
            logger.exception(
                "call_log_promote_service: failed to update promotion tracking for call_log_id=%d",
                call_log_id,
            )

    async def _find_duplicate(
        self,
        db: AsyncSession,
        input_snapshot: dict[str, Any],
        existing_items: list[Any],
    ) -> Any | None:
        """Check for near-duplicate items in the existing dataset via embedding similarity.

        Args:
            db: Active DB session for the embedding credential lookup.
            input_snapshot: The new call log's input snapshot.
            existing_items: Existing LangFuse dataset items.

        Returns:
            The duplicate item if found, or ``None``.
        """
        input_text = str(input_snapshot.get("variables", input_snapshot))

        try:
            new_embedding = await self._embedding_service.embed_text(input_text, db)
        except Exception:
            logger.exception("Embedding generation failed – skipping duplicate detection")
            return None

        best_similarity = 0.0
        best_item = None

        for item in existing_items:
            item_input = getattr(item, "input", None)
            if item_input is None:
                continue
            item_text = str(item_input.get("variables", item_input))

            try:
                item_embedding = await self._embedding_service.embed_text(item_text, db)
            except Exception:
                logger.exception("call_log_promote_service: dataset item embedding failed – skipping")
                continue

            similarity = cosine_similarity(new_embedding, item_embedding)
            if similarity > best_similarity:
                best_similarity = similarity
                best_item = item

        if best_similarity >= _DUPLICATE_SIMILARITY_THRESHOLD:
            logger.info(
                "call_log_promote_service: duplicate detected – similarity=%.4f",
                best_similarity,
            )
            return best_item

        return None

    async def unpromote(
        self,
        db: AsyncSession,
        call_log_id: int,
    ) -> PromoteToDatasetResponse:
        """Remove a previously promoted call log from its LangFuse dataset.

        Clears the dataset item in LangFuse and resets the promote-tracking
        fields on the DB row.
        """
        langfuse = get_langfuse_client()

        # ── Validate call-log row ──────────────────────────────────────
        call_log = await call_log_repository.get_by_id(db, call_log_id)
        if call_log is None:
            return _rejected(
                f"Call log id={call_log_id} does not exist",
                "Call log not found",
            )
        if call_log.promoted_at is None or call_log.dataset_item_id is None:
            return _rejected(
                f"Call log id={call_log_id} is not promoted",
                "Call log not promoted",
            )

        if not langfuse:
            return _rejected(
                "LangFuse is not configured – cannot un-promote",
                "LangFuse unavailable",
            )

        # ── Delete from LangFuse ─────────────────────────────────────────
        item_id = call_log.dataset_item_id
        try:
            langfuse.api.dataset_items.delete(id=item_id)
            logger.info(
                "call_log_promote_service: deleted LangFuse dataset item %s for call_log_id=%d",
                item_id,
                call_log_id,
            )
        except Exception:
            logger.exception(
                "call_log_promote_service: LangFuse delete failed for item %s – clearing DB tracking anyway",
                item_id,
            )

        # ── Clear DB tracking ────────────────────────────────────────────
        try:
            await call_log_repository.clear_promotion(db, call_log_id)
        except Exception:
            logger.exception(
                "call_log_promote_service: failed to clear tracking for call_log_id=%d",
                call_log_id,
            )
            return _rejected("Failed to clear tracking fields", "DB update failed")

        logger.info(
            "call_log_promote_service: un-promoted call_log_id=%d",
            call_log_id,
        )
        return PromoteToDatasetResponse(
            status="created",
            message="Removed from dataset",
            dataset_item_id=None,
        )

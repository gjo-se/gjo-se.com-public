"""Service for observer ticket CRUD operations.

Provides create, query, and status-transition methods used by the
observer cron job and the admin API. The DB access lives in
:mod:`...repositories.observer_ticket_repository`; the service operates on
domain records only.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

import structlog

from app.shared.db_access.db_consumer import DatabaseConsumer
from app.shared.llm_gateway.domain.observer_ticket_contract import ObserverTicketRecord
from app.shared.llm_gateway.repositories import call_log_repository, observer_ticket_repository
from app.shared.llm_gateway.schemas.observer_schemas import ObserverTicketCreate

if TYPE_CHECKING:
    from app.shared.llm_gateway.schemas.observer_schemas import (
        ObserverTicketResolveResponse,
        SuggestedFailureCandidateOut,
    )

logger = structlog.get_logger(__name__)


class ObserverTicketService(DatabaseConsumer):
    """CRUD service for observer tickets."""

    async def create(self, data: ObserverTicketCreate) -> ObserverTicketRecord:
        """Persist a new observer ticket.

        Args:
            data: Validated creation payload.

        Returns:
            The newly created ticket as a domain record.
        """
        return await observer_ticket_repository.create(self._db, data)

    async def get_open(self, task: str | None = None) -> list[ObserverTicketRecord]:
        """Return all open tickets, optionally filtered by task.

        Args:
            task: Optional task identifier filter.

        Returns:
            List of open ticket records.
        """
        return await observer_ticket_repository.get_open(self._db, task)

    async def find_open_by_task_and_type(self, task: str, ticket_type: str) -> ObserverTicketRecord | None:
        """Check if an open ticket already exists for the given task and type.

        Args:
            task: LLM task identifier.
            ticket_type: Ticket type string.

        Returns:
            The existing ticket record or ``None``.
        """
        return await observer_ticket_repository.find_open_by_task_and_type(self._db, task, ticket_type)

    async def acknowledge(self, ticket_id: int) -> ObserverTicketRecord:
        """Set a ticket's status to ``acknowledged``.

        Args:
            ticket_id: Primary key of the ticket.

        Returns:
            The updated ticket record.
        """
        return await observer_ticket_repository.acknowledge(self._db, ticket_id)

    async def set_in_progress(self, ticket_id: int) -> ObserverTicketRecord:
        """Set a ticket's status to ``in_progress``.

        Args:
            ticket_id: Primary key of the ticket.

        Returns:
            The updated ticket record.
        """
        return await observer_ticket_repository.set_in_progress(self._db, ticket_id)

    async def resolve(self, ticket_id: int) -> ObserverTicketResolveResponse:
        """Set a ticket's status to ``resolved`` and collect linked failure candidates.

        Queries the ``observer_ticket_call_log`` junction to build a list of
        :class:`SuggestedFailureCandidateOut` entries for batch-promote suggestions.

        Args:
            ticket_id: Primary key of the ticket.

        Returns:
            :class:`ObserverTicketResolveResponse` with ticket data and
            ``suggested_failure_candidates``.
        """
        record = await observer_ticket_repository.resolve(self._db, ticket_id, resolved_at=datetime.now(UTC))
        candidates = await self._build_failure_candidates(ticket_id)

        from app.shared.llm_gateway.schemas.observer_schemas import ObserverTicketResolveResponse

        return ObserverTicketResolveResponse(
            id=record.id,
            ticket_type=record.ticket_type,
            severity=record.severity,
            task=record.task,
            anomaly_details=record.anomaly_details,
            diagnosis=record.diagnosis,
            langfuse_trace_url=record.langfuse_trace_url,
            status=record.status,
            created_at=record.created_at,
            resolved_at=record.resolved_at,
            suggested_failure_candidates=candidates,
        )

    async def _build_failure_candidates(
        self,
        ticket_id: int,
    ) -> list[SuggestedFailureCandidateOut]:
        """Build failure candidate list from junction-linked call logs."""
        from app.shared.llm_gateway.schemas.observer_schemas import SuggestedFailureCandidateOut

        call_log_ids = await observer_ticket_repository.list_linked_call_log_ids(self._db, ticket_id)
        if not call_log_ids:
            return []

        call_logs = await call_log_repository.list_by_ids(self._db, call_log_ids)

        return [
            SuggestedFailureCandidateOut(
                call_log_id=cl.id,
                task=cl.task or "",
                error_type=cl.error_type,
                success=cl.success,
                duration_ms=cl.duration_ms,
                created_at=cl.created_at.isoformat() if cl.created_at else "",
            )
            for cl in call_logs
        ]

    async def dismiss(self, ticket_id: int) -> ObserverTicketRecord:
        """Set a ticket's status to ``dismissed``.

        Args:
            ticket_id: Primary key of the ticket.

        Returns:
            The updated ticket record.
        """
        return await observer_ticket_repository.dismiss(self._db, ticket_id, resolved_at=datetime.now(UTC))

    async def link_call_log(self, ticket_id: int, call_log_id: int) -> None:
        """Associate a call log with an observer ticket (idempotent).

        Args:
            ticket_id: Primary key of the ticket (must exist).
            call_log_id: Primary key of the call log to link.
        """
        await observer_ticket_repository.link_call_log(self._db, ticket_id, call_log_id)

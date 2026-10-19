"""FastAPI router for observer ticket admin endpoints.

Routes:
    GET  /admin/observer/tickets       – list open tickets
    PATCH /admin/observer/tickets/{id}  – update ticket status
    GET  /admin/observer/metrics        – aggregated LLM metrics for dashboard
"""

from __future__ import annotations

import re
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import (
    get_observer_metrics_service,
    get_observer_ticket_service,
)
from app.shared.llm_gateway.schemas.observer_schemas import (
    ObserverMetricsResponse,
    ObserverTicketResolveResponse,
    ObserverTicketResponse,
    ObserverTicketUpdate,
)
from app.shared.llm_gateway.services.observer_metrics_service import ObserverMetricsService
from app.shared.llm_gateway.services.observer_ticket_service import ObserverTicketService
from app.shared.notification.dependencies.notification_dependencies import get_notification_service
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/observer", tags=["llm · observer · admin"])


_WINDOW_PATTERN = re.compile(r"^(1h|6h|24h)$")


@router.get("/tickets", response_model=list[ObserverTicketResponse])
async def list_tickets(
    _admin: AdminUser,
    task: str | None = Query(None, description="Nach Task filtern (z.B. description-merge)"),
    severity: str | None = Query(None, description="Nach Schweregrad filtern (critical, warning, info)"),
    service: ObserverTicketService = Depends(get_observer_ticket_service),
) -> list[ObserverTicketResponse]:
    """Return all open observer tickets, optionally filtered by task and severity."""
    tickets = await service.get_open(task=task)
    if severity:
        tickets = [t for t in tickets if t.severity == severity]
    return [ObserverTicketResponse.model_validate(t) for t in tickets]


@router.patch("/tickets/{ticket_id}", response_model=ObserverTicketResolveResponse)
async def update_ticket(
    ticket_id: int,
    _admin: AdminUser,
    data: ObserverTicketUpdate,
    service: ObserverTicketService = Depends(get_observer_ticket_service),
) -> ObserverTicketResolveResponse:
    """Update the status of an observer ticket.

    Valid status transitions: acknowledged, in_progress, resolved, dismissed.
    """
    try:
        if data.status == "resolved":
            return await service.resolve(ticket_id)
        if data.status == "dismissed":
            ticket = await service.dismiss(ticket_id)
            return ObserverTicketResolveResponse.model_validate(ticket)
        if data.status == "acknowledged":
            ticket = await service.acknowledge(ticket_id)
            return ObserverTicketResolveResponse.model_validate(ticket)
        if data.status == "in_progress":
            ticket = await service.set_in_progress(ticket_id)
            return ObserverTicketResolveResponse.model_validate(ticket)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültiger Status: {data.status}. Gültig: acknowledged, in_progress, resolved, dismissed",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/metrics", response_model=ObserverMetricsResponse)
async def get_metrics(
    _admin: AdminUser,
    window: str = Query("24h", description="Zeitfenster: 1h, 6h oder 24h"),
    service: ObserverMetricsService = Depends(get_observer_metrics_service),
) -> ObserverMetricsResponse:
    """Aggregierte LLM-Metriken + Ticket-Counts für das Admin-Dashboard.

    Liefert per-Task Statistiken (p50, p95, p99 Latenz, Error-Rate,
    Ticket-Count) sowie eine Zeitreihe für das Latenz-Chart.
    Ergebnisse werden 30s gecached.
    """
    if not _WINDOW_PATTERN.match(window):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Ungültiges Fenster: {window}. Gültig: 1h, 6h, 24h",
        )
    data = await service.compute(window)
    return ObserverMetricsResponse(**data)  # type: ignore[arg-type]


@router.post("/push-test")
async def push_test(_admin: AdminUser) -> dict[str, object]:
    """Sendet eine Test-Push-Benachrichtigung auf das konfigurierte ntfy-Topic.

    Erlaubt die Verifikation des Telefon-Abos ueber den Observer-Button ohne
    auf eine echte Anomalie warten zu muessen.
    """
    try:
        await get_notification_service().send_push(
            title="LLM-Alerts Test",
            message=f"Test-Push vom Observer {datetime.now(UTC).isoformat()}",
            priority=4,
            feature="observer",
        )
        return {"ok": True}
    except Exception as exc:
        logger.exception("Observer test-push failed")
        return {"ok": False, "error": str(exc)}

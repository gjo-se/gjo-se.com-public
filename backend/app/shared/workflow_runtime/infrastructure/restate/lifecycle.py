"""On-demand Readiness des Workers (INC1/INC2, #187-2).

Restate ist always-on (``desired_count=1``, EFS-Volume, ecs-worker-restate.tf)
und wird vom Lifecycle weder hoch- noch runterskaliert. Einzig der Worker ist
on-demand: Damit Bulk-Operationen (Merge, Endcustomer, Batch-Eval) auf prod
genau wie auf dev "einfach laufen", stellt dieser Choke-Point sicher, dass der
Worker vor dem Enqueue erreichbar und die Deployments registriert sind:

  * ``ensure_worker_ready()`` – faehrt den Worker on-demand hoch (prod) bzw.
    ist ein No-op (dev: Restate compose laeuft 24/7). Rolling Burst-TTL haelt
    ihn waehrend aktiver Nutzung oben, ohne bei jedem Enqueue neu zu skalieren.
  * Idle-Reaper – faehrt den Worker nach Burst-Ende + Idle-Grace, und NUR wenn
    keine In-Flight-Invocations mehr laufen, wieder auf 0 herunter
    (Kosten-Ziel).

EIN Codezweig: Der Adapter entscheidet anhand der injizierten Config
(RESTATE_SCALER_* – nur prod gesetzt, ssm-config.tf). dev liefert leere Ziele
=> No-op. Das ist die EINZIGE legitime dev/prod-Differenz (Compute-Kosten).
"""

from __future__ import annotations

import asyncio
import contextlib
import time
from dataclasses import dataclass
from typing import Any

import boto3
import structlog
from botocore.client import BaseClient
from botocore.exceptions import BotoCoreError, ClientError

from app.shared.config.config import settings
from app.shared.workflow_runtime.infrastructure.restate.client import (
    has_inflight_invocations,
    restate_deployments_registered,
    restate_ingress_healthy,
)
from app.shared.workflow_runtime.infrastructure.restate.deployment import register_deployment

logger = structlog.get_logger(__name__)


@dataclass
class _LifecycleState:
    """Mutabler Modul-State (monotonische Zeitstempel + Reaper-Task).

    Bewusst als Objekt statt `global`-Variablen: Attribute koennen ohne
    `global`-Statement mutiert werden (ruff PLW0603). Reiner Daten-Container
    (kein injizierbarer Collaborator) – der Prozess haelt genau einen Zustand.
    """

    ready_until: float = 0.0  # bis wann Readiness garantiert ist (rolling)
    last_activity: float = 0.0
    reaper_task: asyncio.Task[Any] | None = None
    warmup_task: asyncio.Task[Any] | None = None


_state = _LifecycleState()
# Guardiert Scale-up/Readiness gegen das Reaper-Scale-down (kein Race).
_scale_lock = asyncio.Lock()


def _configured() -> bool:
    """True, wenn der ECS-Scaler konfiguriert ist (prod via SSM injiziert)."""
    return bool(
        settings.RESTATE_SCALER_CLUSTER
        and settings.RESTATE_SCALER_RESTATE_SERVICE
        and settings.RESTATE_SCALER_WORKER_SERVICE
    )


def _ecs() -> BaseClient:
    """Create an ECS client for the configured scaler region."""
    return boto3.client("ecs", region_name=settings.RESTATE_SCALER_REGION)


def _running_count(client: BaseClient, service: str) -> int:
    """Return the running task count of an ECS service.

    Args:
        client: boto3 ECS client.
        service: Service name to inspect.

    Returns:
        The service's ``runningCount``, or ``0`` when it is unknown.
    """
    resp = client.describe_services(
        cluster=settings.RESTATE_SCALER_CLUSTER,
        services=[service],
    )
    services = resp.get("services") or []
    return int(services[0].get("runningCount", 0)) if services else 0


def _set_desired(client: BaseClient, service: str, count: int) -> None:
    """Set the desired task count of an ECS service.

    Args:
        client: boto3 ECS client.
        service: Service to scale.
        count: Target desired task count.
    """
    client.update_service(
        cluster=settings.RESTATE_SCALER_CLUSTER,
        service=service,
        desiredCount=count,
    )
    logger.info("restate lifecycle: %s -> desired_count=%d", service, count)


async def _wait_running(client: BaseClient, service: str, deadline: float) -> bool:
    """Poll bis der Service running>=1 erreicht oder das Deadline erreicht ist."""
    while time.monotonic() < deadline:
        try:
            if _running_count(client, service) >= 1:
                return True
        except (ClientError, BotoCoreError):
            logger.warning("restate lifecycle: describe %s failed", service, exc_info=True)
        await asyncio.sleep(5)
    return False


def _mark_ready() -> None:
    """Burst-TTL + Aktivitaet setzen (rolling-Fenster)."""
    now = time.monotonic()
    _state.ready_until = now + settings.RESTATE_READY_TTL
    _state.last_activity = now


async def _ensure_worker_up_on_prod() -> None:
    """Worker hochfahren, registrieren und auf Health warten (prod).

    Restate ist always-on und wird hier nicht angefasst; skaliert wird nur der
    Worker-Service on-demand 0 -> 1.
    """
    deadline = time.monotonic() + settings.RESTATE_SCALE_WAIT_TIMEOUT
    worker_svc = settings.RESTATE_SCALER_WORKER_SERVICE

    try:
        client = _ecs()
    except Exception:
        logger.exception("restate lifecycle: boto3 client init failed")
        raise RuntimeError(
            "Der Restate-Worker konnte nicht gestartet werden – ECS-Client "
            "nicht verfügbar (Backend-Rolle?). Details in den Backend-Logs."
        ) from None

    logger.info(
        "restate lifecycle: scale-up begin cluster=%s worker=%s",
        settings.RESTATE_SCALER_CLUSTER,
        worker_svc,
    )

    try:
        _set_desired(client, worker_svc, 1)
        if not await _wait_running(client, worker_svc, deadline):
            logger.error("restate lifecycle: worker nicht running bis Deadline")
            raise RuntimeError(
                "Der Restate-Worker konnte nicht rechtzeitig gestartet werden (Timeout). Bitte erneut versuchen."
            )
    except (ClientError, BotoCoreError) as exc:
        logger.exception("restate lifecycle: scale-up fehlgeschlagen")
        raise RuntimeError(
            f"Der Restate-Worker konnte nicht hochgefahren werden (ECS-Fehler: {exc}). Bitte Backend-Logs prüfen."
        ) from exc

    # Deployment-Registrierung on-demand + Health-Poll bis Deadline.
    registered = False
    while time.monotonic() < deadline:
        if await restate_ingress_healthy():
            try:
                registered = await register_deployment(delay=0)
            except Exception:
                logger.exception("restate lifecycle: register failed")
                registered = False
            if registered and await restate_ingress_healthy():
                break
        await asyncio.sleep(5)

    if not registered:
        logger.error("restate lifecycle: deployments nicht registriert bis Deadline")
        raise RuntimeError(
            "Restate läuft, aber die Deployments konnten nicht registriert "
            "werden. Bitte erneut versuchen oder Backend-Logs prüfen."
        )

    _mark_ready()
    logger.info("restate lifecycle: bereit (worker up, registriert)")


async def ensure_worker_ready() -> None:
    """Stellt sicher, dass der Worker bereit/registriert ist – EIN Choke-Point.

    Vor dem ersten Enqueue einer Burst aufrufen. Rolling TTL: solange aktiv
    genutzt, bleibt der Worker oben; danach faehrt der Idle-Reaper wieder runter.
    Restate selbst ist always-on und bleibt unangetastet. Auf dev (keine
    ECS-Ziele) reiner No-op.
    """
    if time.monotonic() < _state.ready_until:
        _mark_ready()
        return

    async with _scale_lock:
        if time.monotonic() < _state.ready_until:
            _mark_ready()
            return
        if not _configured():
            # dev: Restate compose ist immer erreichbar; No-op-Scaler.
            _mark_ready()
            return

        # T3 Nachregistrierung: Restate laeuft bereits (z.B. nach Neustart/
        # Deploy, Health ok), aber die Deployments fehlen (ephemerer Prozess)
        # -> idempotent nachregistrieren, damit Invokes nicht ins Leere laufen.
        if await restate_ingress_healthy() and not await restate_deployments_registered():
            logger.info("restate lifecycle: deployments fehlen – re-register")
            try:
                await register_deployment(delay=0)
            except Exception:
                # Nicht werfen: Scale-up/Invoke laeuft weiter, naechster
                # Aufruf versucht es erneut.
                logger.exception(
                    "restate lifecycle: re-register fehlgeschlagen",
                )

        await _ensure_worker_up_on_prod()


def start_worker_warmup() -> None:
    """Worker on-demand als EINEN deduplizierten Hintergrund-Task starten (fire-and-forget).

    Wird aus invoke_workflow aufgerufen und blockiert den HTTP-Request NICHT.
    Single-Flight ueber _state.warmup_task; solange die Burst-TTL (ready_until)
    laeuft, passiert nichts. dev (keine ECS-Ziele) ist ein No-op.
    """
    if time.monotonic() < _state.ready_until:
        return
    if not _configured():
        return  # dev: Worker-Compose laeuft 24/7
    if _state.warmup_task is not None and not _state.warmup_task.done():
        return
    _state.warmup_task = asyncio.create_task(_warmup_safe())


async def _warmup_safe() -> None:
    """Run the worker warm-up, swallowing and logging any failure."""
    try:
        await ensure_worker_ready()
    except Exception:
        logger.exception("restate lifecycle: worker warm-up fehlgeschlagen")


async def _idle_reaper_loop() -> None:
    """Periodisch runterskalieren, wenn Burst beendet + idle + keine Invocations."""
    while True:
        await asyncio.sleep(settings.RESTATE_REAPER_INTERVAL)
        if not _configured():
            continue
        async with _scale_lock:
            # Nur runterfahren, wenn Bereitschaft abgelaufen UND Idle-Grace um
            # UND keine aktiven Invocations -> laufende Merges nie abwürgen.
            if _state.ready_until <= 0:
                continue
            if time.monotonic() < _state.ready_until + settings.RESTATE_IDLE_GRACE:
                continue
            if await has_inflight_invocations():
                continue
            try:
                client = _ecs()
                _set_desired(client, settings.RESTATE_SCALER_WORKER_SERVICE, 0)
            except (ClientError, BotoCoreError):
                logger.warning("restate lifecycle: scale-down fehlgeschlagen", exc_info=True)
                continue
            _state.ready_until = 0.0
            _state.last_activity = 0.0
            logger.info("restate lifecycle: scale-down worker auf 0 (idle, keine Invocations)")


def start_idle_reaper() -> None:
    """Startet den Idle-Reaper als Hintergrund-Task (idempotent)."""
    if _state.reaper_task is not None and not _state.reaper_task.done():
        return
    _state.reaper_task = asyncio.create_task(_idle_reaper_loop())


async def stop_idle_reaper() -> None:
    """Stoppt den Idle-Reaper (App-Shutdown)."""
    if _state.reaper_task is None:
        return
    _state.reaper_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await _state.reaper_task
    _state.reaper_task = None

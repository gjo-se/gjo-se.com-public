"""ScanCodeWorkflow — sequentielle Code-Analyse → Architekturmodell.

Orchestriert die Activities nacheinander:
1. DockerComposeParser – Parse docker-compose services
2. PydepsActivity (L3, gated via ``_ENABLE_L3``) – backend-Imports analysieren
3. DeterministicProcessor – Catalog lookup + C4 object creation (inkl. L3)
4. LlmEnrichment – Optional LLM enrichment of descriptions
   (+ L3-Component-Summaries aus Modul-Docstrings)

DepCruiser (Frontend-Strang) ist für den kommenden FE-AST-Scan vorgesehen
und läuft als separate Phase am Ende – deaktiviert via ``_ENABLE_DEPCRUISER``.

Jede Activity läuft als Restate Service-Invocation via ``ctx.generic_call``
mit eigener Fehlerbehandlung.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Workflow, WorkflowContext

from app.shared.workflow_runtime.infrastructure.restate.activity_call import call_activity

logger = structlog.get_logger(__name__)

scan_code_workflow = Workflow("ScanCodeWorkflow")

_ACTIVITIES = [
    ("DockerComposeParserActivity", "docker_compose"),
    ("DeterministicProcessor", "deterministic_processor"),
    ("LlmEnrichment", "llm_enrichment"),
]

_ENABLE_L3: bool = True
"""Feature-Flag: L3-Phase (Pydeps) aktivieren.

Wird später per Config/DB steuerbar. Die Pydeps-Phase schreibt die
``backend``-Section in ``imports/backend.json``, bevor der
``DeterministicProcessor`` sie im selben Lauf verarbeitet.
"""

_ENABLE_ER: bool = True
"""Feature-Flag: ER-Scanner-Phase aktivieren.

Die Scanner-Phase schreibt das kanonische ``tables/app.json``
(``SqlAlchemyScannerActivity``), bevor der ``DeterministicProcessor`` die
ER-Section im selben Lauf verarbeitet. Bei ``False`` wird die Scanner-Phase
übersprungen und der Scan läuft L1/L2/L3-unverändert – die ER-Section
skippt dann graceful, weil keine frischen ``tables/*.json`` vorliegen.
"""

_ENABLE_DEPCRUISER: bool = False
"""Feature-Flag: DepCruiser (FE-Importe) deaktiviert.

Die DepCruiser-Phase ist erst für den kommenden FE-AST-Scan gedacht und
wird momentan nicht benötigt. Solange ``False``, wird die
``DepCruiserActivity`` (``npx dependency-cruiser``) nicht aufgerufen und
der Scan läuft ohne den Frontend-Import-Strang erfolgreich durch.
"""


@scan_code_workflow.main()
async def run(ctx: WorkflowContext, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute scan-code pipeline: docker_compose → pydeps → deterministic_processor → llm_enrichment.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``trigger`` (str) key.

    Returns:
        Dict with ``status`` (``"completed"`` or ``"failed"``),
        ``result`` (if completed) or ``error`` (if failed), and
        ``current_activity`` for progress tracking.
    """
    trigger: str = arg.get("trigger", "pipeline")

    logger.info("ScanCodeWorkflow: trigger=%s", trigger)

    # ── Phase 0: DockerComposeParser (fail-hard) ───────────────────────────
    dcp_result = await _run_docker_compose(ctx)
    if dcp_result.get("status") == "failed":
        return dcp_result

    # ── Phase 1: Pydeps (L3, gated) ────────────────────────────────────────
    if _ENABLE_L3:
        await _run_pydeps(ctx)

    # ── Phase 1.5: ER-Scanner (gated) ─────────────────────────────────────
    # Schreibt tables/app.json, damit der DeterministicProcessor die
    # frische ER-Section im selben Lauf verarbeitet.
    if _ENABLE_ER:
        await _run_scanner(ctx)

    # ── Phase 2: DeterministicProcessor (fail-hard) ───────────────────────
    dp_result = await _run_deterministic_processor(ctx)
    if dp_result.get("status") == "failed":
        return dp_result

    # ── Phase 3: LlmEnrichment (optional) ─────────────────────
    _, enrichment_skipped, enrichment_reason = await _run_llm_enrichment(ctx, trigger)
    # ── Phase 4: DepCruiser (gated) ───────────────────────────
    if _ENABLE_DEPCRUISER and (fail := await _run_depcruiser(ctx)) is not None:
        return fail
    # ── Success ────────────────────────────────────────────────
    return await _build_success_result(
        ctx,
        enrichment_skipped=enrichment_skipped,
        enrichment_reason=enrichment_reason,
    )


async def _run_docker_compose(ctx: WorkflowContext) -> dict[str, Any]:
    """Run the DockerComposeParser phase (fail-hard).

    Sets ``current_activity`` to ``"docker_compose"`` and invokes the
    ``DockerComposeParserActivity``. A failure (``ok: False`` or exception)
    sets ``status: "failed"`` + ``error`` on the context and returns a
    failed result dict, aborting the workflow. On success returns the
    activity result dict so the caller keeps it for the final result builder.

    Args:
        ctx: Restate workflow context.

    Returns:
        The activity result dict on success, or a dict with
        ``status: "failed"`` on failure.
    """
    ctx.set("current_activity", "docker_compose")
    try:
        dcp_result = await call_activity(
            ctx,
            "DockerComposeParserActivity",
            {},
        )
        if not dcp_result.get("ok"):
            error_msg = dcp_result.get("error", "DockerComposeParser failed")
            logger.error("ScanCodeWorkflow: docker_compose failed: %s", error_msg)
            ctx.set("status", "failed")
            ctx.set("error", error_msg)
            return {"status": "failed", "error": error_msg, "current_activity": "docker_compose"}
        logger.info(
            "ScanCodeWorkflow: docker_compose done – %d services found",
            dcp_result.get("services_found", 0),
        )
        ctx.set("docker_services_found", dcp_result.get("services_found", 0))
        return dcp_result
    except Exception as exc:
        logger.exception("ScanCodeWorkflow: docker_compose exception")
        ctx.set("status", "failed")
        ctx.set("error", str(exc))
        return {"status": "failed", "error": str(exc), "current_activity": "docker_compose"}


async def _run_deterministic_processor(ctx: WorkflowContext) -> dict[str, Any]:
    """Run the DeterministicProcessor phase (fail-hard).

    Sets ``current_activity`` to ``"deterministic_processor"`` and invokes
    the ``DeterministicProcessor`` activity. A failure (``ok: False`` or
    exception) sets ``status: "failed"`` + ``error`` on the context and
    returns a failed result dict, aborting the workflow. On success returns
    the activity result dict so the caller keeps it for the final result
    builder.

    Args:
        ctx: Restate workflow context.

    Returns:
        The activity result dict on success, or a dict with
        ``status: "failed"`` on failure.
    """
    ctx.set("current_activity", "deterministic_processor")
    try:
        dp_result = await call_activity(
            ctx,
            "DeterministicProcessor",
            {},
        )
        if not dp_result.get("ok"):
            error_msg = dp_result.get("error", "DeterministicProcessor failed")
            logger.error("ScanCodeWorkflow: deterministic_processor failed: %s", error_msg)
            ctx.set("status", "failed")
            ctx.set("error", error_msg)
            return {"status": "failed", "error": error_msg, "current_activity": "deterministic_processor"}
        logger.info(
            "ScanCodeWorkflow: deterministic_processor done – %d objects, %d edges",
            dp_result.get("objects_created", 0),
            dp_result.get("edges_created", 0),
        )
        ctx.set("objects_created", dp_result.get("objects_created", 0))
        ctx.set("edges_created", dp_result.get("edges_created", 0))
        return dp_result
    except Exception as exc:
        logger.exception("ScanCodeWorkflow: deterministic_processor exception")
        ctx.set("status", "failed")
        ctx.set("error", str(exc))
        return {"status": "failed", "error": str(exc), "current_activity": "deterministic_processor"}


async def _run_pydeps(ctx: WorkflowContext) -> None:
    """Run the L3 pydeps phase with error isolation.

    Sets ``current_activity`` to ``"pydeps"`` and invokes the
    ``PydepsActivity`` so it writes the fresh ``backend`` section into
    ``imports/backend.json`` before the DeterministicProcessor runs. A
    pydeps failure (``ok: False`` or exception) is logged as a warning and
    swallowed — L3 must never block L1/L2; the DeterministicProcessor
    graceful-skips an empty ``backend`` section anyway.

    Args:
        ctx: Restate workflow context.
    """
    ctx.set("current_activity", "pydeps")
    try:
        pd_result = await call_activity(
            ctx,
            "PydepsActivity",
            {},
        )
        if not pd_result.get("ok"):
            logger.warning(
                "ScanCodeWorkflow: pydeps skipped: %s",
                pd_result.get("error", "Pydeps returned ok=False"),
            )
        else:
            logger.info(
                "ScanCodeWorkflow: pydeps done – %d backend modules",
                pd_result.get("modules_found", 0),
            )
    except Exception:
        logger.exception(
            "ScanCodeWorkflow: pydeps exception, continuing",
        )


async def _run_scanner(ctx: WorkflowContext) -> None:
    """Run the ER scanner phase with error isolation.

    Sets ``current_activity`` to ``"scanner"`` and invokes the
    ``SqlAlchemyScannerActivity`` so it writes the fresh
    ``tables/app.json`` before the DeterministicProcessor runs. A
    scanner failure (``ok: False`` or exception) is logged as a warning and
    swallowed — the scanner must never block L1/L2/L3; the ER-section
    graceful-skips when no fresh ``tables/*.json`` exist.

    Args:
        ctx: Restate workflow context.
    """
    ctx.set("current_activity", "scanner")
    try:
        sc_result = await call_activity(
            ctx,
            "SqlAlchemyScannerActivity",
            {},
        )
        if not sc_result.get("ok"):
            logger.warning(
                "ScanCodeWorkflow: scanner skipped: %s",
                sc_result.get("error", "SqlAlchemyScannerActivity returned ok=False"),
            )
        else:
            tables = sc_result.get("tables", {})
            logger.info(
                "ScanCodeWorkflow: scanner done – %d tables",
                sum(tables.values()) if isinstance(tables, dict) else 0,
            )
    except Exception:
        logger.exception(
            "ScanCodeWorkflow: scanner exception, continuing",
        )


async def _run_llm_enrichment(
    ctx: WorkflowContext,
    trigger: str,
) -> tuple[dict[str, Any] | None, bool, str | None]:
    """Run the optional LlmEnrichment phase with error isolation.

    Sets ``current_activity`` to ``"llm_enrichment"`` and invokes the
    ``LlmEnrichment`` activity. Never aborts the workflow: a skipped result
    (``ok: False`` or ``skipped``) or an exception only marks enrichment as
    skipped and records a reason. On success the number of enriched
    component descriptions is persisted on the context for the final result
    builder.

    Args:
        ctx: Restate workflow context.
        trigger: Pipeline trigger passed to the enrichment activity.

    Returns:
        Tuple ``(llm_result, enrichment_skipped, enrichment_reason)`` where
        ``llm_result`` is ``None`` on failure, ``enrichment_skipped`` is
        ``True`` when enrichment did not run, and ``enrichment_reason``
        describes the skip.
    """
    ctx.set("current_activity", "llm_enrichment")
    enrichment_skipped = False
    enrichment_reason: str | None = None
    llm_result: dict[str, Any] | None = None
    try:
        llm_result = await call_activity(
            ctx,
            "LlmEnrichment",
            {"trigger": trigger},
        )
        if not llm_result.get("ok"):
            logger.warning(
                "ScanCodeWorkflow: llm_enrichment skipped: %s",
                llm_result.get("error", "LlmEnrichment returned ok=False"),
            )
            enrichment_skipped = True
            enrichment_reason = llm_result.get("error", "unknown")
        elif llm_result.get("skipped"):
            logger.warning(
                "ScanCodeWorkflow: llm_enrichment skipped: %s",
                llm_result.get("reason", "unknown"),
            )
            enrichment_skipped = True
            enrichment_reason = llm_result.get("reason", "unknown")
        else:
            components_enriched = llm_result.get("component_descriptions_enriched", 0)
            ctx.set("component_descriptions_enriched", components_enriched)
            logger.info(
                "ScanCodeWorkflow: llm_enrichment done – %d descriptions, %d labels, %d components enriched",
                llm_result.get("descriptions_enriched", 0),
                llm_result.get("labels_enriched", 0),
                components_enriched,
            )
    except Exception as exc:
        error_msg = str(exc)
        logger.exception(
            "ScanCodeWorkflow: llm_enrichment exception, continuing",
        )
        enrichment_skipped = True
        enrichment_reason = error_msg
    return llm_result, enrichment_skipped, enrichment_reason


async def _run_depcruiser(ctx: WorkflowContext) -> dict[str, Any] | None:
    """Run the gated DepCruiser phase (fail-hard).

    Sets ``current_activity`` to ``"depcruiser"`` and invokes the
    ``DepCruiserActivity``. A failure (``ok: False`` or exception) sets
    ``status: "failed"`` + ``error`` on the context and returns the failed
    result dict, aborting the workflow. On success returns ``None``.

    Args:
        ctx: Restate workflow context.

    Returns:
        ``None`` on success, or a dict with ``status: "failed"`` on failure.
    """
    ctx.set("current_activity", "depcruiser")
    try:
        dc_result = await call_activity(
            ctx,
            "DepCruiserActivity",
            {"include_only": "^frontend/src"},
        )
        if not dc_result.get("ok"):
            error_msg = dc_result.get("error", "DepCruiser failed")
            logger.error("ScanCodeWorkflow: depcruiser failed: %s", error_msg)
            ctx.set("status", "failed")
            ctx.set("error", error_msg)
            return {"status": "failed", "error": error_msg, "current_activity": "depcruiser"}
        logger.info("ScanCodeWorkflow: depcruiser done")
        return None
    except Exception as exc:
        logger.exception("ScanCodeWorkflow: depcruiser exception")
        ctx.set("status", "failed")
        ctx.set("error", str(exc))
        return {"status": "failed", "error": str(exc), "current_activity": "depcruiser"}


async def _build_success_result(
    ctx: WorkflowContext,
    *,
    enrichment_skipped: bool,
    enrichment_reason: str | None,
) -> dict[str, Any]:
    """Build the success result and finalize the workflow state.

    Reads the phase metrics (services, objects, edges, enriched component
    descriptions) from the Restate context, where the phase methods set them
    via ``ctx.set``. Assembles the ``result`` dict with the same shape as
    before, sets ``status: "completed"``, ``result`` and resets
    ``current_activity`` to ``None``, then returns the completed payload.

    Args:
        ctx: Restate workflow context.
        enrichment_skipped: Whether enrichment was skipped.
        enrichment_reason: Reason for the skip, if any.

    Returns:
        Dict with ``status: "completed"`` and the ``result`` payload.
    """
    result: dict[str, Any] = {
        "objects_updated": 0,
        "objects_new": (await ctx.get("objects_created")) or 0,
        "objects_missing": 0,
        "services_found": (await ctx.get("docker_services_found")) or 0,
        "edges_created": (await ctx.get("edges_created")) or 0,
        "component_descriptions_enriched": ((await ctx.get("component_descriptions_enriched")) or 0),
    }
    if enrichment_skipped:
        result["enrichment_skipped"] = True
        result["enrichment_reason"] = enrichment_reason
    ctx.set("status", "completed")
    ctx.set("result", result)
    ctx.set("current_activity", None)

    logger.info(
        "ScanCodeWorkflow: completed – services=%d objects_new=%d edges=%d enrichment_skipped=%s",
        result["services_found"],
        result["objects_new"],
        result["edges_created"],
        enrichment_skipped,
    )

    return {"status": "completed", "result": result}

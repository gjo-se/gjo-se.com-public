"""LLM-gestuetzter Merge von Projektbeschreibungen.

Ein Master und alle seine Slaves werden in **einem** LLM-Call
(``task="description-merge"``) zu einer konsolidierten deutschen
Markdown-Beschreibung zusammengefuehrt. Der Merge-Output ist free-form
Text (nicht durch ein JSON-Schema gezwaengt), damit Zeilenumbrueche und
Markdown-Struktur erhalten bleiben.

Greift auf zwei DB-Sessions zu: ``gjo_se_com`` (Project) und ``core``
(LLM-Infrastruktur).

Die ``variables`` werden dynamisch aus der ``TaskRegistry`` gebaut:
Der Service mappt ``PlaceholderDefinition.key`` auf Projekt-Daten
(Prefix-Konvention: ``master_*`` → Master-Feld, ``slave_*`` → Aggregat
ueber alle Slaves).
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator, Callable
from datetime import UTC, datetime

import structlog

from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.client.client import LLMClient
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY, DescriptionMergeTrigger

logger = structlog.get_logger(__name__)

_SLAVE_SEPARATOR = "\n\n---\n\n"


def _join_slave_descriptions(slaves: list[ProjectOut]) -> str:
    """Concatenate all slave descriptions into one block for the prompt.

    Each slave is prefixed with its title so the LLM can attribute details.
    Slaves without a description are skipped.

    Args:
        slaves: Slave projects to include.

    Returns:
        Joined descriptions separated by a horizontal rule, or empty string.
    """
    parts: list[str] = []
    for slave in slaves:
        if not slave.description:
            continue
        title = slave.title or ""
        parts.append(f"**{title}**\n\n{slave.description}" if title else slave.description)
    return _SLAVE_SEPARATOR.join(parts)


def _build_variables(master: ProjectOut, slaves: list[ProjectOut]) -> dict[str, str]:
    """Build the prompt variables for a full master+slaves merge.

    Resolves registry placeholders by prefix convention:
    ``master_<field>`` → ``getattr(master, field)``;
    ``slave_descriptions`` → all slave descriptions joined;
    ``slave_count`` → number of slaves with content.

    Args:
        master: Master project.
        slaves: All slave projects of the master.

    Returns:
        Dict mapping every registered placeholder key to its string value.
    """
    variables: dict[str, str] = {}

    definition = TASK_REGISTRY.get("description-merge")
    if definition is None:
        return variables

    joined_slaves = _join_slave_descriptions(slaves)
    slave_count = sum(1 for s in slaves if s.description)

    for ph in definition.placeholders:
        if ph.key.startswith("master_"):
            field_name = ph.key[len("master_") :]
            value = getattr(master, field_name, None)
            variables[ph.key] = str(value) if value is not None else ""
        elif ph.key == "slave_descriptions":
            variables[ph.key] = joined_slaves
        elif ph.key == "slave_count":
            variables[ph.key] = str(slave_count)
        else:
            variables[ph.key] = ""

    return variables


class DescriptionMergeService:
    """LLM-gestuetzter Merge von Projektbeschreibungen (Single-Call).

    Fuehrt Master + alle Slaves zusammen und persistiert das Ergebnis in
    ``Project.merged_description_de`` samt ``merged_at``-Zeitstempel.

    ``merge_group`` und ``resolve_group`` laufen ueber den zentralen
    ``TaskExecutorService`` (uniformer Pfad: Logging, Circuit Breaker,
    Auto-Retry).  ``merge_group_stream`` verwendet ``LLMClient`` direkt –
    Streaming ist nicht retryable und daher eine dokumentierte Ausnahme
    vom Executor-Pfad.
    """

    def __init__(self, llm_client_factory: Callable[[str], LLMClient]) -> None:
        self._llm_client_factory = llm_client_factory

    async def merge_group(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
        project_id: int,
        trigger: str | None = DescriptionMergeTrigger.BUTTON,
    ) -> str:
        """Merge a master and all its slaves into one description in a single call.

        Explicit admin action (triggered by the "Zusammenfassung erstellen"
        button in the detail view). Always regenerates and folds every slave
        into one prompt, so the whole group is summarised in a single LLM call
        regardless of group size.

        The call is routed through :class:`TaskExecutorService` so every
        invocation benefits from call logging, circuit breaker protection, and
        auto-retry.

        Persists the result to ``master.merged_description_de`` and stamps
        ``merged_at``, which clears the derived dirty state.

        Args:
            gjo_db: gjo_se_com DB session (Project-Tabelle).
            core_db: core DB session (LLM-Infrastruktur).
            project_id: ID des Master-Projekts.

        Returns:
            Die konsolidierte deutsche Beschreibung als String.

        Raises:
            ValueError: Master-Projekt nicht gefunden.
            RuntimeError: Der Executor lieferte ``success=False`` (Fehlerdetails
                in ``error_type`` des Ergebnis-Dicts).
        """
        from app.fbf.repositories import project_repository

        master = await project_repository.get_out_by_id(gjo_db, project_id)
        if master is None:
            raise ValueError(f"Project with id={project_id} not found")

        slaves = await project_repository.get_slaves_out(gjo_db, project_id)
        slaves.sort(key=lambda s: s.similarity_score or 0.0, reverse=True)

        variables = _build_variables(master, slaves)

        exec_result = await get_task_executor_service().execute_task(
            db=core_db,
            task_key="description-merge",
            variables=variables,
            project_id=project_id,
            trigger=trigger,
        )
        if not exec_result["success"]:
            error_type = exec_result.get("error_type", "unknown")
            raise RuntimeError(f"description-merge failed: error_type={error_type}")

        merged: str = exec_result["result"]  # type: ignore[assignment]
        await project_repository.set_merged_fields(
            gjo_db,
            project_id,
            merged_description_de=merged,
            merged_at=datetime.now(UTC),
        )
        await gjo_db.commit()

        logger.info(
            "merge_group: project_id=%d merged 1 master + %d slaves in a single call (%d chars)",
            project_id,
            len(slaves),
            len(merged),
        )
        return merged

    async def resolve_group(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
        project_id: int,
        trigger: str | None = DescriptionMergeTrigger.BUTTON,
    ) -> None:
        """Eagerly resolve mapping → model → credential → prompt for a group.

        Up-front pre-check used before starting a streaming response, so a
        configuration error (inactive mapping, disabled model, missing
        credential/prompt) surfaces as an HTTP error rather than a silently
        aborting stream. Persists nothing.

        Uses a throwaway ``LLMClient`` for the resolve call – this is a
        pre-flight-only operation that does not produce a call log and is
        not routed through the executor.

        Args:
            gjo_db: gjo_se_com DB session (Project-Tabelle).
            core_db: core DB session (LLM-Infrastruktur).
            project_id: ID des Master-Projekts.

        Raises:
            ValueError: Master-Projekt nicht gefunden.
            NoModelForTaskError: Kein aktives Mapping.
            LLMModelDisabledError: Zugewiesenes Modell ist inaktiv.
            NoCredentialForTaskError: Keine gueltigen Credentials.
            NoPromptForTaskError: Kein aktives Prompt-Template.
            PromptVariableMissingError: Pflicht-Platzhalter fehlt.
        """
        from app.fbf.repositories import project_repository

        master = await project_repository.get_out_by_id(gjo_db, project_id)
        if master is None:
            raise ValueError(f"Project with id={project_id} not found")

        slaves = await project_repository.get_slaves_out(gjo_db, project_id)
        slaves.sort(key=lambda s: s.similarity_score or 0.0, reverse=True)

        variables = _build_variables(master, slaves)
        client = self._llm_client_factory("")  # model resolved via task mapping
        await client.resolve(
            db=core_db,
            task="description-merge",
            variables=variables,
            project_id=project_id,
            trigger=trigger,
        )

    async def merge_group_stream(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
        project_id: int,
        trigger: str | None = DescriptionMergeTrigger.BUTTON,
    ) -> AsyncIterator[str]:
        """Stream the group merge, yielding text chunks and persisting at the end.

        Streaming variant of :meth:`merge_group`. Yields incremental text
        chunks as the model generates them. After the stream completes, the
        full text is persisted to ``master.merged_description_de`` and
        ``merged_at`` is stamped (clears the derived dirty state).

        Uses ``LLMClient`` directly – streaming is not retryable and therefore
        a documented exception to the uniform executor path.

        Args:
            gjo_db: gjo_se_com DB session (Project-Tabelle).
            core_db: core DB session (LLM-Infrastruktur).
            project_id: ID des Master-Projekts.

        Yields:
            Text chunks in generation order.

        Raises:
            ValueError: Master-Projekt nicht gefunden.
            LLMCallError: Streaming-Call gescheitert.
            LLMModelDisabledError: Zugewiesenes Modell ist inaktiv.
            NoCredentialForTaskError: Keine gueltigen Credentials.
        """
        from app.fbf.repositories import project_repository

        master = await project_repository.get_out_by_id(gjo_db, project_id)
        if master is None:
            raise ValueError(f"Project with id={project_id} not found")

        slaves = await project_repository.get_slaves_out(gjo_db, project_id)
        slaves.sort(key=lambda s: s.similarity_score or 0.0, reverse=True)

        variables = _build_variables(master, slaves)

        # Streaming is not retryable – direct LLMClient usage is a
        # documented exception to the uniform executor path.  The
        # throwaway client is discarded after the stream completes.
        client = self._llm_client_factory("")  # model resolved via task mapping

        chunks: list[str] = []
        call_log_id: int | None = None
        async for chunk in client.call_text_stream(
            db=core_db,
            task="description-merge",
            variables=variables,
            project_id=project_id,
            trigger=trigger,
        ):
            if call_log_id is None:
                call_log_id = client._call_log_id
                if call_log_id is not None:
                    meta = json.dumps({"type": "meta", "call_log_id": call_log_id})
                    yield meta + "\n"
            chunks.append(chunk)
            yield chunk

        merged = "".join(chunks).strip()
        await project_repository.set_merged_fields(
            gjo_db,
            project_id,
            merged_description_de=merged,
            merged_at=datetime.now(UTC),
            call_log_id=call_log_id,
        )
        await gjo_db.commit()

        logger.info(
            "merge_group_stream: project_id=%d merged 1 master + %d slaves (%d chars)",
            project_id,
            len(slaves),
            len(merged),
        )

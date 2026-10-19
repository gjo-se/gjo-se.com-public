"""LLM-gestuetzte Skill-Extraktion aus konsolidierten Projektbeschreibungen.

Aus ``Project.merged_description_de`` eines Masters werden per Structured
Output (``task="skill-extraction"``) die explizit genannten Skills
extrahiert. Jeder extrahierte Skill, der noch nicht in ``fbf_skill`` existiert,
wird als ``pending``-Eintrag angelegt und spaeter (Increment 2) manuell
kuratiert. Kuratierte Werte bestehender Skills werden nie ueberschrieben.

Drei Betriebsmodi:
- **Testlauf** (:meth:`test_run`): Dry-run gegen einen Master – Ergebnis wird
  nur geloggt, nichts persistiert.
- **Backfill** (:meth:`backfill`): Extraktion ueber alle Master mit
  konsolidierter Beschreibung.
- **Mapper-Trigger** (:meth:`extract_for_master`): Extraktion fuer genau einen
  Master, gedacht zum Aufruf pro Map-Lauf (analog Description-Merge).

Greift auf zwei DB-Sessions zu: ``gjo_se_com`` (Project + Skill) und
``core`` (LLM-Infrastruktur). Die Persistenz/Verknuepfung liegt in
:mod:`app.fbf.services.skill_extraction_write_service`, der Output-Vertrag in
:mod:`app.fbf.domain.skill_extraction_contract`; die hier oeffentlich
verfuegbaren Vertragstypen bleiben ueber dieses Modul importierbar (Fassade).
"""

from __future__ import annotations

import asyncio

import structlog

from app.fbf.constants import SkillTagName
from app.fbf.domain.skill_extraction_contract import (
    ExtractedSkill,
    FailedProject,
    SkillExtractionResult,
)
from app.fbf.exceptions import TaskExecutionError
from app.fbf.repositories import project_repository
from app.fbf.schemas.project_schemas import ProjectOut
from app.fbf.services import skill_extraction_write_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.domain.embedding_consumer_contract import EmbeddingClientConsumer
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.shared.llm_gateway.domain.task_registry_rules import SkillExtractionTrigger

logger = structlog.get_logger(__name__)


class SkillExtractionService(EmbeddingClientConsumer[EmbeddingClient]):
    """LLM-gestuetzte Skill-Extraktion aus Master-Projektbeschreibungen.

    Extrahiert Skills via Structured Output und legt neue Skills als
    ``pending``-Eintraege in ``fbf_skill`` an. Bestehende Skills werden anhand
    ihres eindeutigen Namens erkannt und nicht veraendert.

    Alle LLM-Calls laufen ueber den zentralen ``TaskExecutorService``
    (uniformer Pfad: Logging, Circuit Breaker, Auto-Retry).
    """

    async def test_run(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
        project_id: int,
    ) -> list[ExtractedSkill]:
        """Dry-run: extract skills for one master, log the result, persist nothing.

        Testlauf-Modus. Fuehrt die Extraktion gegen einen einzelnen Master aus
        und protokolliert das Ergebnis, ohne ``fbf_skill`` zu veraendern –
        gedacht zur Prompt-/Qualitaetspruefung.

        Args:
            gjo_db: gjo_se_com DB session (Project-Tabelle).
            core_db: core DB session (LLM-Infrastruktur).
            project_id: ID des Master-Projekts.

        Returns:
            Die extrahierten Skills (nicht persistiert). Leer, wenn der Master
            keine konsolidierte Beschreibung hat oder ein Slave ist.

        Raises:
            ValueError: Master-Projekt nicht gefunden.
            LLMCallError: LLM-Call nach allen Retries gescheitert.
            LLMValidationError: LLM-Antwort verletzt das Output-Schema.
        """
        master = await self._load_master(gjo_db, project_id)
        if master is None:
            return []

        result = await self._extract(
            core_db,
            gjo_db,
            master.merged_description_de or "",
            project_id=project_id,
            trigger=SkillExtractionTrigger.PIPELINE,
        )
        skills = result.skills

        logger.info(
            "test_run: project_id=%d extracted %d skills (dry-run, not persisted): %s | role_match=%s role_new=%s",
            project_id,
            len(skills),
            [s.name for s in skills],
            result.job_role_match,
            result.job_role_new,
        )
        return skills

    async def backfill(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
    ) -> dict[str, object]:
        """Extract and persist skills for every master with a merged description.

        Backfill-Modus. Concurrency wird zentral ueber das LLMClient-Semaphor
        (LLM_MAX_CONCURRENT) und den DB-Connection-Pool gesteuert.
        """
        from app.shared.llm_gateway.client.client import classify_exception

        masters = await self._load_masters_with_merged_description(gjo_db)
        total = len(masters)

        lock = asyncio.Lock()
        processed = 0
        skills_created = 0
        failed_projects: list[FailedProject] = []

        logger.info("backfill: %d master(s) with merged description to process", total)

        async def process_one(master: ProjectOut) -> None:
            """Extract skills for one master project in its own worker session.

            Re-fetches the master, skips already-canonical rows, runs the
            extraction and records success/failure counters.

            Args:
                master: Master project scheduled for backfill.
            """
            nonlocal processed, skills_created
            try:
                async with project_repository.open_session() as w_gjo, project_repository.open_core_session() as w_core:
                    # Re-fetch master in worker session (detached from caller)
                    m = await project_repository.get_out_by_id(w_gjo, master.id)
                    if m is None or m.canonical_id is not None:
                        return

                    result = await self._extract(
                        w_core,
                        w_gjo,
                        m.merged_description_de or "",
                        project_id=m.id,
                        trigger=SkillExtractionTrigger.BACKFILL,
                    )
                    created = await skill_extraction_write_service.persist_pending_skills(
                        w_gjo, w_core, result.skills, self._embedding_service
                    )
                    await skill_extraction_write_service.link_skills_to_master(w_gjo, m.id, result.skills)
                    await self._apply_job_role(w_gjo, m, result)

                    async with lock:
                        skills_created += created
                        processed += 1
            except TaskExecutionError as exc:
                async with lock:
                    failed_projects.append(
                        FailedProject(project_id=master.id, error_type=exc.error_type, message=str(exc))
                    )
            except Exception as exc:
                logger.exception("backfill: extraction failed for project_id=%d", master.id)
                async with lock:
                    failed_projects.append(
                        FailedProject(
                            project_id=master.id,
                            error_type=classify_exception(exc).value,
                            message=str(exc),
                        )
                    )

        await asyncio.gather(*[process_one(m) for m in masters])

        logger.info(
            "backfill: done – total=%d processed=%d skills_created=%d errors=%d",
            total,
            processed,
            skills_created,
            len(failed_projects),
        )
        return {
            "total": total,
            "processed": processed,
            "skills_created": skills_created,
            "errors": len(failed_projects),
            "failed_projects": failed_projects,
        }

    async def extract_for_master(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
        project_id: int,
        trigger: str | None = None,
    ) -> list[ExtractedSkill]:
        """Extract and persist skills for a single master (mapper-trigger mode).

        Mapper-Trigger-Modus. Pro Map-Lauf fuer einen Master aufrufbar (analog
        Description-Merge). Neue Skills werden als ``pending`` persistiert;
        bestehende Skills bleiben unangetastet. Slaves und Master ohne
        konsolidierte Beschreibung werden uebersprungen.

        Args:
            gjo_db: gjo_se_com DB session (Project + Skill).
            core_db: core DB session (LLM-Infrastruktur).
            project_id: ID des Master-Projekts.
            trigger: Optional trigger label (call-log context).

        Returns:
            Die extrahierten Skills. Leer, wenn uebersprungen.

        Raises:
            ValueError: Master-Projekt nicht gefunden.
        """
        master = await self._load_master(gjo_db, project_id)
        if master is None:
            return []

        result = await self._extract(
            core_db,
            gjo_db,
            master.merged_description_de or "",
            project_id=project_id,
            trigger=SkillExtractionTrigger.PIPELINE,
        )
        skills = result.skills
        created = await skill_extraction_write_service.persist_pending_skills(
            gjo_db, core_db, skills, self._embedding_service
        )
        await skill_extraction_write_service.link_skills_to_master(gjo_db, master.id, skills)
        await self._apply_job_role(gjo_db, master, result)
        await self.backfill_text_matches(gjo_db, master.id)

        logger.info(
            "extract_for_master: project_id=%d extracted %d skills, created %d new pending | role_match=%s role_new=%s",
            project_id,
            len(skills),
            created,
            result.job_role_match,
            result.job_role_new,
        )
        return skills

    async def _extract(
        self,
        core_db: AsyncSession,
        gjo_db: AsyncSession,
        merged_description: str,
        *,
        project_id: int | None = None,
        trigger: SkillExtractionTrigger | None = None,
    ) -> SkillExtractionResult:
        """Run the LLM structured-output call via the task executor and return the full result.

        Injects three constrained-choice lists into the prompt: the confirmed
        skills, the confirmed job roles and the available skill tags. The LLM
        matches existing catalog entries (implicit synonym mapping at
        extraction time) or proposes new ones; the result is normalized so
        unknown proposals are treated as new ``pending`` suggestions rather
        than applied directly.

        The call is routed through :class:`TaskExecutorService` so every
        invocation benefits from call logging, circuit breaker protection, and
        auto-retry – no direct ``LLMClient`` usage.

        Args:
            core_db: core DB session (LLM-Infrastruktur).
            gjo_db: gjo_se_com DB session (confirmed skills + job roles).
            merged_description: Konsolidierte deutsche Master-Beschreibung.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).

        Returns:
            Structured extraction result (skills + role classification).

        Raises:
            TaskExecutionError: The executor returned a failure (caller can read
                ``error_type`` for the standardised error code).
        """
        from app.fbf.services import job_role_service, skill_service

        known_roles = await job_role_service.list_confirmed_names(gjo_db)
        known_roles_text = ", ".join(known_roles) if known_roles else "(keine)"

        known_skills = await skill_service.list_confirmed_names(gjo_db)
        known_skills_text = ", ".join(known_skills) if known_skills else "(keine)"

        available_tags_text = ", ".join(tag.value for tag in SkillTagName)

        exec_result = await get_task_executor_service().execute_task(
            db=core_db,
            task_key="skill-extraction",
            variables={
                "merged_description": merged_description,
                "known_job_roles": known_roles_text,
                "known_skills": known_skills_text,
                "available_tags": available_tags_text,
            },
            project_id=project_id,
            trigger=trigger,
        )
        if not exec_result["success"]:
            error_type = exec_result.get("error_type", "unknown")
            raise TaskExecutionError(error_type)

        result: SkillExtractionResult = exec_result["result"]  # type: ignore[assignment]
        return self._normalize_role(result, known_roles)

    @staticmethod
    def _normalize_role(result: SkillExtractionResult, known_roles: list[str]) -> SkillExtractionResult:
        """Validate ``job_role_match`` against the known-role list (exact name).

        If the match is not an exact known role, demote it to ``job_role_new``
        so an unvalidated hallucinated match never gets applied directly.

        Args:
            result: Raw LLM result.
            known_roles: Exact confirmed role names offered in the prompt.

        Returns:
            The result with a validated role classification.
        """
        match = result.job_role_match.strip() if result.job_role_match else None
        if match and match not in known_roles:
            # Not an exact known role → treat as a new suggestion.
            result.job_role_new = result.job_role_new or match
            result.job_role_match = None
        else:
            result.job_role_match = match
        return result

    async def _load_master(self, gjo_db: AsyncSession, project_id: int) -> ProjectOut | None:
        """Load a master project eligible for extraction, else None.

        Skips (returns None) for slave projects and masters without a
        consolidated description, logging the reason.

        Args:
            gjo_db: gjo_se_com DB session.
            project_id: ID des Projekts.

        Returns:
            Der Master-Project, oder None wenn nicht extrahierbar.

        Raises:
            ValueError: Projekt nicht gefunden.
        """
        master = await project_repository.get_out_by_id(gjo_db, project_id)
        if master is None:
            raise ValueError(f"Project with id={project_id} not found")

        if master.canonical_id is not None:
            logger.info("skip project_id=%d: is a slave (canonical_id set)", project_id)
            return None

        if not master.merged_description_de:
            logger.info("skip project_id=%d: no merged_description_de", project_id)
            return None

        return master

    @staticmethod
    async def _load_masters_with_merged_description(gjo_db: AsyncSession) -> list[ProjectOut]:
        """Load all masters that have a consolidated description.

        Args:
            gjo_db: gjo_se_com DB session.

        Returns:
            Liste der Master (``canonical_id IS NULL`` und
            ``merged_description_de IS NOT NULL``).
        """
        return await project_repository.get_masters_with_merged_description(gjo_db)

    @staticmethod
    async def backfill_text_matches(
        gjo_db: AsyncSession,
        project_id: int,
    ) -> int:
        """Scan ``merged_description_de`` against ALL DB skills via substring matching.

        Public entry point (router + ``extract_for_master``); delegates to
        :mod:`app.fbf.services.skill_extraction_write_service`.

        Args:
            gjo_db: gjo_se_com DB session.
            project_id: Master project primary key.

        Returns:
            Number of additionally linked skills.
        """
        return await skill_extraction_write_service.backfill_text_matches(gjo_db, project_id)

    @staticmethod
    async def _apply_job_role(gjo_db: AsyncSession, master: ProjectOut, result: SkillExtractionResult) -> None:
        """Set ``master.job_role_id`` from the classification result.

        Delegates to :mod:`app.fbf.services.skill_extraction_write_service`:
        ``job_role_match`` → assign the confirmed role; ``job_role_new`` →
        get-or-create a ``pending`` role and assign it; neither → leave
        ``job_role_id`` as NULL.

        Args:
            gjo_db: gjo_se_com DB session (Project + JobRole).
            master: The master project to classify.
            result: Validated extraction result.
        """
        await skill_extraction_write_service.apply_job_role(gjo_db, master, result)

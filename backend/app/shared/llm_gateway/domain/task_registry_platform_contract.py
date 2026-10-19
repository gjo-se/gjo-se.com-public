"""Registry entries for the platform, observability and application tasks.

Groups the task definitions of the SRE/viscera/observability chain
(incident-analysis, scan-code-enrich, component-summary, rejected-notice) plus
the application-score use case. Consumed by
:mod:`app.shared.llm_gateway.domain.task_registry_rules`.
"""

from app.shared.llm_gateway.domain.task_definition_contract import (
    PlaceholderDefinition,
    TaskDefinition,
)
from app.shared.llm_gateway.domain.task_trigger_contract import (
    ApplicationScoreTrigger,
    ComponentSummaryTrigger,
    DiagnoseTrigger,
    RejectedNoticeTrigger,
    ScanCodeEnrichTrigger,
)

PLATFORM_TASK_DEFINITIONS: dict[str, TaskDefinition] = {
    "incident-analysis": TaskDefinition(
        key="incident-analysis",
        display_name="Incident Analysis",
        description=(
            "SRE-Diagnose: Analysiert Loki-Logs und erstellt eine strukturierte "
            "IncidentDiagnosisOut (root_cause, affected, action, action_type, "
            "confidence, fixable)"
        ),
        allowed_triggers=(
            DiagnoseTrigger.MANUAL,
            DiagnoseTrigger.ALERT,
        ),
        output_mode="structured",
        output_schema="shared.mcp.schemas.incident_diagnosis_schemas:IncidentDiagnosisOut",
        placeholders=[
            PlaceholderDefinition(
                key="problem",
                label="Problembeschreibung",
                description="Vom User/Kilo beschriebenes Symptom (z.B. 'Backend wirft 500er')",
                category="Input",
            ),
            PlaceholderDefinition(
                key="raw_loki_results",
                label="Loki-Rohdaten",
                description=("JSON der Loki-Query-Ergebnisse (Log-Einträge mit timestamp, line, labels)"),
                category="Input",
            ),
        ],
    ),
    "scan-code-enrich": TaskDefinition(
        key="scan-code-enrich",
        display_name="Scan-Code Enrich",
        description=(
            "Reichert Architecture-Descriptions und Relationship-Labels (nur source:llm) mit fachlichem Kontext an"
        ),
        allowed_triggers=(
            ScanCodeEnrichTrigger.PIPELINE,
            ScanCodeEnrichTrigger.ADMIN_DEBUG,
        ),
        output_mode="structured",
        output_schema="viscera.schemas.enrichment_schemas:ScanCodeEnrichOut",
        placeholders=[
            PlaceholderDefinition(
                key="architecture_objects",
                label="Architecture Objects",
                description="JSON-Array der Architecture-Objekte mit source:llm-Feldern",
                category="Input",
            ),
        ],
    ),
    "component-summary": TaskDefinition(
        key="component-summary",
        display_name="Component Summary",
        description=("Fasst Modul-Docstrings einer Component zu einer prägnanten fachlichen Beschreibung zusammen"),
        allowed_triggers=(
            ComponentSummaryTrigger.PIPELINE,
            ComponentSummaryTrigger.ADMIN_DEBUG,
        ),
        output_mode="structured",
        output_schema="viscera.schemas.enrichment_schemas:ComponentSummaryOut",
        placeholders=[
            PlaceholderDefinition(
                key="components",
                label="Components",
                description=("JSON-Array mit id, name und Modul-Docstrings je Component"),
                category="Input",
            ),
        ],
    ),
    "rejected-notice": TaskDefinition(
        key="rejected-notice",
        display_name="Rejected Notice Feedback",
        description=(
            "Analysiert eine abgelehnte LLM-Generierung, verbessert den LangFuse-Prompt "
            "und generiert ein korrigiertes Architektur-Objekt"
        ),
        allowed_triggers=(
            RejectedNoticeTrigger.UI,
            RejectedNoticeTrigger.ADMIN_DEBUG,
        ),
        output_mode="structured",
        output_schema="shared.llm_gateway.schemas.rejected_notice_schemas:RejectedNoticeOut",
        placeholders=[
            PlaceholderDefinition(
                key="object_id",
                label="Objekt-ID",
                description="Dot-separated ID des abgelehnten Architektur-Objekts",
                category="Object",
            ),
            PlaceholderDefinition(
                key="object_type",
                label="Objekt-Typ",
                description="Typ des abgelehnten Objekts (System, Container, Component, etc.)",
                category="Object",
            ),
            PlaceholderDefinition(
                key="yaml_fragment",
                label="YAML-Fragment",
                description="Das abgelehnte YAML-Fragment des Objekts",
                category="Object",
            ),
            PlaceholderDefinition(
                key="reason",
                label="Ablehnungsgrund",
                description="Gregs Begründung für die Ablehnung des Objekts",
                category="Feedback",
            ),
            PlaceholderDefinition(
                key="prompt_suggestion",
                label="Prompt-Verbesserung",
                description="Gregs optionaler Vorschlag zur Prompt-Verbesserung",
                category="Feedback",
            ),
            PlaceholderDefinition(
                key="context",
                label="Kontext",
                description="Zusätzlicher Kontext (Diagramm-Typ, Connections, etc.)",
                category="Context",
            ),
        ],
    ),
    "application-score": TaskDefinition(
        key="application-score",
        display_name="Application Score",
        description="Bewertet die Content-/Form-Kriterien einer Bewerbung gegen die Ausschreibung (strukturiert).",
        allowed_triggers=(
            ApplicationScoreTrigger.BUTTON,
            ApplicationScoreTrigger.ADMIN_DEBUG,
        ),
        output_mode="structured",
        output_schema="application.services.score_service:ApplicationScoreLLMResult",
        placeholders=[
            PlaceholderDefinition(
                key="ausschreibung",
                label="Ausschreibung",
                description="Aufgelöster Ausschreibungstext (nach etwaigem description_override)",
                category="Input",
            ),
            PlaceholderDefinition(
                key="paket",
                label="Bewerbungspaket",
                description="Mail (Subject/Body) + CV-Kontext, flach als Text",
                category="Input",
            ),
            PlaceholderDefinition(
                key="kriterien",
                label="Kriterien-Rubrik",
                description="Die 6 Content-/Form-Kriterien als Text (key + Label), die das LLM bewerten soll",
                category="Rubric",
            ),
        ],
    ),
}

"""Registry entries for the ``endcustomer-*`` research pipeline tasks.

Groups the task definitions of the end-customer research/fusion chain
(extraction, evaluation, dedup-evaluation, fusion, company-name). Consumed by
:mod:`app.shared.llm_gateway.domain.task_registry_rules`.
"""

from app.shared.llm_gateway.domain.task_definition_contract import (
    PlaceholderDefinition,
    TaskDefinition,
)
from app.shared.llm_gateway.domain.task_trigger_contract import EndcustomerTrigger

ENDCUSTOMER_TASK_DEFINITIONS: dict[str, TaskDefinition] = {
    "endcustomer-extraction": TaskDefinition(
        key="endcustomer-extraction",
        display_name="Endkunden Signal-Extraktion",
        description=(
            "Extrahiert strukturierte Signale (Firmen-Hinweise, Produkt-Hinweise, "
            "markante Phrasen, Tech-Stack) aus der Projektbeschreibung"
        ),
        allowed_triggers=(
            EndcustomerTrigger.PIPELINE,
            EndcustomerTrigger.BUTTON,
            EndcustomerTrigger.ADMIN_DEBUG,
            EndcustomerTrigger.ACT_TEST,
        ),
        output_mode="structured",
        output_schema="fbf.schemas.endcustomer_schemas:EndcustomerSignalsOut",
        placeholders=[
            PlaceholderDefinition(
                key="title",
                label="Titel",
                description="Titel des Projekts (Master)",
                category="Project",
            ),
            PlaceholderDefinition(
                key="description",
                label="Beschreibung",
                description="Originale Projektbeschreibung (Master + alle Slaves, unverändert)",
                category="Project",
            ),
            PlaceholderDefinition(
                key="industry",
                label="Branche",
                description="Branche des Projekts aus project.industry (INC 1a) – kann leer sein",
                category="Project",
            ),
            PlaceholderDefinition(
                key="city",
                label="Stadt",
                description="Stadt des Projekts – kann leer sein",
                category="Project",
            ),
            PlaceholderDefinition(
                key="skills",
                label="Skills",
                description="Komma-separierte Skill-Liste des Projekts",
                category="Project",
            ),
        ],
    ),
    "endcustomer-evaluation": TaskDefinition(
        key="endcustomer-evaluation",
        display_name="Endkunden Evaluation",
        description=(
            "Bewertet Zielseiten-Text + Vector-Similarity gegen Projekt-Signale → Confidence + Reasoning pro Kandidat"
        ),
        allowed_triggers=(
            EndcustomerTrigger.PIPELINE,
            EndcustomerTrigger.BUTTON,
            EndcustomerTrigger.ADMIN_DEBUG,
            EndcustomerTrigger.ACT_TEST,
        ),
        output_mode="structured",
        output_schema="fbf.schemas.endcustomer_schemas:EndcustomerEvaluationOut",
        placeholders=[
            PlaceholderDefinition(
                key="page_text",
                label="Karriereseiten-Text",
                description="Volltext der Zielseite (Karriereseite des Kandidaten)",
                category="Candidate",
            ),
            PlaceholderDefinition(
                key="similarity",
                label="Vector-Similarity",
                description="Cosine-Similarity zwischen Projekt-Embedding und Karriereseiten-Embedding (0.0–1.0)",
                category="Candidate",
            ),
            PlaceholderDefinition(
                key="signals",
                label="Projekt-Signale",
                description="JSON der extrahierten EndcustomerSignalsOut (Output von endcustomer-extraction)",
                category="Project",
            ),
        ],
    ),
    "endcustomer-dedup-evaluation": TaskDefinition(
        key="endcustomer-dedup-evaluation",
        display_name="Endkunden Dedup-Evaluation",
        description=(
            "Bewertet Dedup-Cousin-Beschreibungen auf Endkunden-Hinweise "
            "(Firmennamen, Abteilungen) und liefert evaluierte Cross-Reference-Daten"
        ),
        allowed_triggers=(
            EndcustomerTrigger.PIPELINE,
            EndcustomerTrigger.BUTTON,
            EndcustomerTrigger.ADMIN_DEBUG,
            EndcustomerTrigger.ACT_TEST,
        ),
        output_mode="structured",
        output_schema="fbf.schemas.endcustomer_schemas:EndcustomerDedupEvaluationOut",
        placeholders=[
            PlaceholderDefinition(
                key="merged_descriptions",
                label="Cousin-Beschreibungen",
                description="JSON der zusammengeführten Beschreibungen aller Dedup-Cousins (Vector-Retrieval Ergebnis)",
                category="Dedup",
            ),
            PlaceholderDefinition(
                key="project_signals",
                label="Projekt-Signale",
                description="JSON der extrahierten Signale aus Activity 1 (endcustomer-extraction Output)",
                category="Dedup",
            ),
        ],
    ),
    "endcustomer-fusion": TaskDefinition(
        key="endcustomer-fusion",
        display_name="Endkunden Treffer-Fusion",
        description="Konsolidiert bewertete Web-Kandidaten zu einer finalen, deduplizierten Endkunden-Kandidatenliste",
        allowed_triggers=(
            EndcustomerTrigger.PIPELINE,
            EndcustomerTrigger.BUTTON,
            EndcustomerTrigger.ADMIN_DEBUG,
            EndcustomerTrigger.ACT_TEST,
        ),
        output_mode="structured",
        output_schema="fbf.schemas.endcustomer_schemas:EndcustomerFusionResultOut",
        placeholders=[
            PlaceholderDefinition(
                key="web_candidates",
                label="Web-Kandidaten",
                description="JSON der vor-bewerteten Web-Kandidaten (mit Confidence + Reasoning aus Act 7)",
                category="Fusion",
            ),
        ],
    ),
    "endcustomer-company-name": TaskDefinition(
        key="endcustomer-company-name",
        display_name="Endkunden Firmenname-Extraktion",
        description="Extrahiert den Firmennamen aus Suchergebnis-Titel+URL und gibt einen Namen pro Zeile zurück",
        allowed_triggers=(
            EndcustomerTrigger.PIPELINE,
            EndcustomerTrigger.BUTTON,
            EndcustomerTrigger.ADMIN_DEBUG,
            EndcustomerTrigger.ACT_TEST,
        ),
        output_mode="text",
        placeholders=[
            PlaceholderDefinition(
                key="results_json",
                label="Suchergebnisse",
                description="JSON-Array mit {title, url} für jeden Kandidaten",
                category="Input",
            ),
        ],
    ),
}

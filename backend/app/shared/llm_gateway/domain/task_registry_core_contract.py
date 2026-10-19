"""Registry entries for the core pipeline, inline and address tasks.

Groups the task definitions that drive the description-merge / skill-extraction
pipeline plus the inline-explain and address-extraction use cases. Consumed by
:mod:`app.shared.llm_gateway.domain.task_registry_rules`.
"""

from app.shared.llm_gateway.domain.task_definition_contract import (
    PlaceholderDefinition,
    TaskDefinition,
)
from app.shared.llm_gateway.domain.task_trigger_contract import (
    AddressExtractionTrigger,
    DescriptionMergeTrigger,
    InlineExplainTrigger,
    SkillExtractionTrigger,
)

CORE_TASK_DEFINITIONS: dict[str, TaskDefinition] = {
    "description-merge": TaskDefinition(
        key="description-merge",
        display_name="Description Merge",
        description="Fasst Master- und Slave-Beschreibungen zu einer deutschen Beschreibung zusammen",
        allowed_triggers=(
            DescriptionMergeTrigger.PIPELINE,
            DescriptionMergeTrigger.BUTTON,
            DescriptionMergeTrigger.ADMIN_DEBUG,
        ),
        output_mode="text",
        placeholders=[
            PlaceholderDefinition(
                key="master_title",
                label="Titel (Master)",
                description="Titel des Master-Projekts",
                category="Master",
            ),
            PlaceholderDefinition(
                key="master_description",
                label="Beschreibung (Master)",
                description="Rohtext der Master-Beschreibung",
                category="Master",
            ),
            PlaceholderDefinition(
                key="slave_descriptions",
                label="Beschreibungen (Slaves)",
                description="Zusammengeführte Beschreibungen aller Slave-Projekte",
                category="Slave",
            ),
            PlaceholderDefinition(
                key="slave_count",
                label="Anzahl Slaves",
                description="Anzahl der verknüpften Slave-Projekte",
                category="Slave",
            ),
        ],
    ),
    "skill-extraction": TaskDefinition(
        key="skill-extraction",
        display_name="Skill Extraction",
        description="Extrahiert Skills und klassifiziert die Job-Rolle aus der Master-Beschreibung",
        allowed_triggers=(
            SkillExtractionTrigger.PIPELINE,
            SkillExtractionTrigger.BACKFILL,
            SkillExtractionTrigger.AUTO_RETRY,
            SkillExtractionTrigger.MANUAL_RETRY,
            SkillExtractionTrigger.ADMIN_DEBUG,
        ),
        output_mode="structured",
        output_schema="fbf.services.skill_extraction_service:SkillExtractionResult",
        placeholders=[
            PlaceholderDefinition(
                key="merged_description",
                label="Konsolidierte Beschreibung",
                description="Zusammengeführte deutsche Master-Beschreibung (merged_description_de)",
                category="Master",
            ),
            PlaceholderDefinition(
                key="known_skills",
                label="Bekannte Skills",
                description=(
                    "Komma-separierte Liste der bestätigten (confirmed) Skills. "
                    "Das LLM wählt passende Einträge aus oder schlägt neue vor."
                ),
                category="Master",
            ),
            PlaceholderDefinition(
                key="known_job_roles",
                label="Bekannte Job-Rollen",
                description=(
                    "Komma-separierte Liste der bestätigten (confirmed) Job-Rollen. "
                    "Das LLM wählt die passendste oder schlägt genau eine neue vor."
                ),
                category="Master",
            ),
        ],
    ),
    "inline-explain": TaskDefinition(
        key="inline-explain",
        display_name="Inline Explain",
        description="Erklärt einen markierten Fachbegriff im Kontext des umgebenden Texts",
        allowed_triggers=(InlineExplainTrigger.CONTEXT_MENU,),
        output_mode="text",
        placeholders=[
            PlaceholderDefinition(
                key="term",
                label="Begriff",
                description="Der zu erklärende Fachbegriff",
                category="Input",
            ),
            PlaceholderDefinition(
                key="context",
                label="Kontext",
                description="Der umgebende Text, in dem der Begriff vorkommt",
                category="Input",
            ),
        ],
    ),
    "address-extraction": TaskDefinition(
        key="address-extraction",
        display_name="Adressextraktion aus Impressum",
        description="Extrahiert Straße, PLZ, Stadt, Land aus dem Text einer Impressums-Seite",
        allowed_triggers=(
            AddressExtractionTrigger.BUTTON,
            AddressExtractionTrigger.ADMIN_DEBUG,
        ),
        output_mode="structured",
        output_schema="crm.services.address_extraction_service:AddressExtractionResult",
        placeholders=[
            PlaceholderDefinition(
                key="html_text",
                label="Impressum-Text",
                description="Der extrahierte Text aus dem HTML-Body der Impressums-Seite",
                category="Input",
            ),
        ],
    ),
}

"""Core domain enumerations – shared across modules."""

from enum import StrEnum


class ColorToken(StrEnum):
    """13-Token color palette for core tags (Single Source of Truth)."""

    RED = "red"
    ORANGE = "orange"
    AMBER = "amber"
    YELLOW = "yellow"
    LIME = "lime"
    GREEN = "green"
    TEAL = "teal"
    CYAN = "cyan"
    SKY = "sky"
    BLUE = "blue"
    VIOLET = "violet"
    PINK = "pink"
    GRAY = "gray"


class TaggableType(StrEnum):
    """Registrierte Entity-Typen fuer polymorphe Tag-Zuordnung (SSOT).

    Neue getaggte Entitaet → ein Eintrag hier genuegt.
    Das Enum treibt die Admin-UI-Combobox und die Scope-Validierung an.
    """

    APPLICATION_COMMUNICATION = "application_communication"
    CRM_COMPANY = "crm_company"
    CRM_PERSON = "crm_person"
    FBF_SKILL = "fbf_skill"


class StatusableType(StrEnum):
    """Registrierte Entity-Typen fuer polymorphe Status-Zuordnung (SSOT).

    Neue Entitaet mit Status → ein Eintrag hier genuegt.
    Treibt die Admin-UI-Scope-Combobox und die Scope-Validierung an.
    """

    ADMIN_CREDENTIAL = "admin_credential"
    APPLICATION_CAREER_ENTRY = "application_career_entry"
    APPLICATION_PROFILE = "application_profile"
    APPLICATION_SUBMISSION = "application_submission"
    CORE_CRON_JOB_CONFIG = "core_cron_job_config"
    CORE_SITE_CONTENT = "core_site_content"
    CORE_TECHNOLOGY_CATALOG = "core_technology_catalog"
    CORE_NOTIFICATION_TRANSPORT = "core_notification_transport"
    CRM_COMPANY = "crm_company"
    CRM_PERSON = "crm_person"
    FBF_JOB_ROLE = "fbf_job_role"
    FBF_SEARCH_TERM = "fbf_search_term"
    FBF_SKILL = "fbf_skill"
    LLM_MODEL = "llm_model"
    LLM_TASK_MODEL_CONFIG = "llm_task_model_config"
    PORTFOLIO = "portfolio"
    PROJECT = "project"
    PROJECT_ENDCUSTOMER_CANDIDATE = "project_endcustomer_candidate"
    USERS = "users"
    VISCERA_ARCHITECTURE_OBJECT = "viscera_architecture_object"

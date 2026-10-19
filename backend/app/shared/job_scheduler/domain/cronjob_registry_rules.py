"""CronJob registry – single source of truth for all scheduled jobs.

Every cron job is registered here as a ``CronJobDefinition``.
The registry is the single source of truth for all code-known cron jobs.

:data KNOWN_CRON_JOBS: List of all known cron jobs.
    key and display_name are read-only – the admin can only change
    ``cron_expression`` and ``is_active`` via the config table.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CronJobDefinition:
    """Describes a code-known cron job.

    Attributes:
        key: Unique identifier for the code binding (e.g. ``"freelancermap_scraper"``).
        display_name: User-friendly label for the admin interface (German).
        description: Short description of what the job does (German).
        default_cron: Default 5-field cron expression (minute hour day month weekday).
        category: Grouping hint for the UI (e.g. ``"aiscope"``, ``"maintenance"``, ``"evaluation"``).
    """

    key: str
    display_name: str
    description: str
    default_cron: str
    category: str


#: All known cron jobs with an implemented handler.
#: Adding a new job = add an entry here + register the APScheduler handler.
KNOWN_CRON_JOBS: list[CronJobDefinition] = [
    CronJobDefinition(
        key="freelancermap_scraper",
        display_name="Freelancermap Scraper",
        description="Scraper für freelancermap.de – aktualisiert Projekt-Daten und Skills",
        default_cron="0 2 * * *",
        category="aiscope",
    ),
    CronJobDefinition(
        key="llm_call_log_purge",
        display_name="LLM Call Log Purge",
        description="Bereinigt alte LLM-Call-Logs gemäß Retention-Policy",
        default_cron="0 3 * * *",
        category="maintenance",
    ),
    CronJobDefinition(
        key="contact_spam_purge",
        display_name="Contact Spam Purge",
        description="Löscht als Spam markierte Kontakt-Submissions nach der PII-Retention (30 Tage)",
        default_cron="30 3 * * *",
        category="maintenance",
    ),
    CronJobDefinition(
        key="nightly_eval",
        display_name="Nightly Eval",
        description="Führt die nächtliche Evaluation aller LLM-Tasks durch",
        default_cron="0 3 * * *",
        category="evaluation",
    ),
    CronJobDefinition(
        key="communication_reminder",
        display_name="Communication Reminder",
        description="Prüft alle 15 Minuten auf fällige Wiedervorlagen und sendet Push + E-Mail",
        default_cron="*/15 * * * *",
        category="crm",
    ),
    CronJobDefinition(
        key="technology_catalog_sync",
        display_name="Technology Catalog Sync",
        description=(
            "Synchronisiert den Technology-Katalog wöchentlich mit der externen "
            "Katalog-Quelle (idempotent via external_id)"
        ),
        default_cron="0 3 * * 0",  # Sonntag 03:00
        category="technology_catalog",
    ),
    CronJobDefinition(
        key="technology_icon_downloader",
        display_name="Technology Icon Downloader",
        description=(
            "Lädt fehlende Technology-Icons vom Icon-CDN, vektorisiert zu SVG "
            "(Drain bis Queue leer oder 90min, adaptives Backoff)"
        ),
        default_cron="0 */2 * * *",
        category="technology_catalog",
    ),
]

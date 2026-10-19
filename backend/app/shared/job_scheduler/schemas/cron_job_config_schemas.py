"""Pydantic-Schemas fuer CronJobConfig (Response + Update)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CronJobConfigOut(BaseModel):
    """Response-Schema fuer eine CronJob-Konfiguration.

    Attributes:
        key: Eindeutiger Registry-Key.
        cron_expression: Aktive Cron-Expression (5-Felder).
        last_run_at: Letzter erfolgreicher Lauf (UTC).
        next_run_at: Geplanter naechster Lauf (UTC).
        display_name: Anzeigename aus der Registry (Deutsch).
        description: Beschreibung aus der Registry (Deutsch).
        default_cron: Default-Cron-Expression aus der Registry.
        category: Kategorie aus der Registry (Gruppierung im Admin-UI).
        status: Core-Status (active/inactive) via core_statusable.
        status_color_token: Color-Token (green/gray).
    """

    model_config = ConfigDict(from_attributes=True)

    key: str
    cron_expression: str
    id: int | None = None
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None
    display_name: str
    description: str
    default_cron: str
    category: str
    status: str | None = None
    status_color_token: str | None = None


class CronJobConfigUpdate(BaseModel):
    """Request-Body zum Aktualisieren (cron_expression).

    Alle Felder sind optional – nur gesetzte Felder werden aktualisiert.
    """

    model_config = {"extra": "forbid"}

    cron_expression: str | None = None

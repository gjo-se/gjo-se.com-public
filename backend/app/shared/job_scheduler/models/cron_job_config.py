"""SQLAlchemy-Modell fuer CronJobConfig (gespeicherte Cron-Expression + Aktiv-Status)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin


class CronJobConfig(TimestampMixin, Base):
    """Persistente Konfiguration eines Cron-Jobs.

    Die Tabelle speichert die Laufzeit-konfigurierbaren Felder
    (cron_expression). Die statische Job-Definition
    (key, display_name, description, default_cron, category) kommt
    aus der :mod:`app.shared.job_scheduler.domain.cronjob_registry_rules`.

    Status (active/inactive) wird via shared_statusable (shared_cron_job_config) verwaltet.

    Attributes:
        id: Auto-increment Primaerschluessel.
        key: Eindeutiger Registry-Key (unique).
        cron_expression: 5-Felder-Cron-Expression (Minute Stunde Tag Monat Wochentag).
        last_run_at: Zeitstempel des letzten erfolgreichen Laufs.
        next_run_at: Geplanter Zeitstempel des naechsten Laufs.
        created_at: Anlage-Zeitstempel (UTC).
        updated_at: Letzter Update-Zeitstempel (UTC).
    """

    __tablename__ = "shared_cron_job_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    cron_expression: Mapped[str] = mapped_column(String, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

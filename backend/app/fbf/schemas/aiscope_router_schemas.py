"""Request/response models extracted from the aiscope admin router."""

from pydantic import BaseModel, Field, field_validator

from app.shared.parsing import start_dates as application_start


class ScraperRunRequest(BaseModel):
    """Request body for the manual scraping run.

    Attributes:
        max_results: Limit per JobRole. 0 or None = unlimited.
        force_full: If True, the delta cutoff is ignored and all
            projects (including older ones) are saved. Useful for
            a one-time backfill.
    """

    max_results: int | None = Field(
        default=None,
        ge=0,
        le=500,
        description="Limit pro JobRole (0 oder None = unbegrenzt).",
    )
    force_full: bool = Field(
        default=False,
        description="Cutoff ignorieren – alle Projekte ab Seite 1 (Backfill).",
    )
    since_days: int | None = Field(
        default=None,
        ge=1,
        le=365,
        description=(
            "Unterer Zeit-Bound (Tage): nur Projekte der letzten *n* Tage cachen – "
            "gebundener Backfill fuer neue SearchTerms. Bestehende Terms behalten "
            "ihren normalen Delta-Cutoff."
        ),
    )

    @property
    def effective_max_results(self) -> int | None:
        """Returns None (unlimited) when max_results is 0 or None."""
        return self.max_results if self.max_results else None


# ── ProjectFreelancerMap endpoints (Admin) ───────────────────────────────────


class ProjectStatusUpdate(BaseModel):
    """Request body for setting a project's exclusive status."""

    status: str = Field(..., description="Neuer Status des Projekts")


class ProjectTitleNormalizedUpdate(BaseModel):
    """Request body for setting a project's curated mail title."""

    title_normalized: str | None = Field(
        default=None,
        max_length=500,
        description=(
            "Kuratierter Titel – Rollen-Quelle fuer Betreff und Anschreiben der "
            "Bewerbungs-Mail; leer/None loescht den Override (Fallback: bereinigter Titel)."
        ),
    )


class ProjectNotesUpdate(BaseModel):
    """Request body for setting a project's free-text notes (Markdown source)."""

    notes: str | None = Field(
        default=None,
        max_length=20000,
        description="Freitext-Bemerkungen in Markdown; leer/None loescht die Bemerkungen.",
    )


class ProjectHourlyRateUpdate(BaseModel):
    """Request body for setting a project's estimated offer hourly rate (EUR/h)."""

    hourly_rate: int | None = Field(
        default=None,
        ge=0,
        le=500,
        description=("Geschaetzter Angebots-Stundensatz in EUR/h (Obergrenze; None loescht den Wert)."),
    )


class ProjectMyHourlyRateUpdate(BaseModel):
    """Request body for setting a project's own (manual) hourly rate (EUR/h)."""

    my_hourly_rate: int | None = Field(
        default=None,
        ge=0,
        le=500,
        description=("Eigener Stundensatz in EUR/h (None loescht den Wert)."),
    )


class ProjectMyStartDateUpdate(BaseModel):
    """Request body for setting a project's manual start override."""

    my_start_date: str | None = Field(
        default=None,
        max_length=20,
        description=(
            "Manueller Start ('MM/YYYY' oder 'DD.MM.YYYY'), Sofort-Marker "
            "('asap'/'sofort'/'kurzfristig'/'nächstmöglich'/'schnellstmöglich'), "
            "Ignore-Token ('-'/'nein'/'ignore'/'n/a') oder None zum Loeschen."
        ),
    )

    @field_validator("my_start_date")
    @classmethod
    def _validate_my_start_date(cls, value: str | None) -> str | None:
        """Accepts a parseable start date, an immediate/ignore token, or empty."""
        if value is None:
            return None
        token = value.strip()
        if token == "":
            return None
        if token.lower() in application_start.IGNORE_TOKENS:
            return token.lower()
        if application_start.is_immediate_token(token):
            return token.lower()
        if application_start.start_from_manual(token) is None:
            raise ValueError(
                "Format 'MM/YYYY' oder 'DD.MM.YYYY', Sofort-Marker "
                "('asap'/'sofort'/...), Ignore-Token ('-'/'nein'/'ignore'/'n/a') "
                "oder leer."
            )
        return token


class TransferReferencesRequest(BaseModel):
    """Request body for transferring references from an old to a new master."""

    from_project_id: int = Field(
        ...,
        description="ID des alten Masters, dessen Referenzen auf den Ziel-Master uebertragen werden.",
    )


class TransferReferencesResponse(BaseModel):
    """Summary of the reference transfer performed on a master switch."""

    status_moved: bool = Field(..., description="True, wenn ein Projekt-Status uebertragen wurde.")
    crm_links_moved: int = Field(..., description="Anzahl der umgehaengten CRM-Links.")
    application_moved: bool = Field(..., description="True, wenn eine Bewerbung umgehaengt wurde.")


class MonthlyProjectPointOut(BaseModel):
    """Monthly project volume data point."""

    month: str
    total: int
    matching: int


class BackfillSkillErrorOut(BaseModel):
    """A single failed project during the text-backfill bulk run."""

    project_id: int
    error: str


class BackfillSkillsResponse(BaseModel):
    """Summary returned by the text-backfill bulk endpoint."""

    scanned: int = Field(description="Total projects scanned")
    linked: int = Field(description="Total additionally linked skills")
    errors: list[BackfillSkillErrorOut] = Field(default_factory=list)

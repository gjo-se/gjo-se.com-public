"""Pydantic schemas for normalised Projects (create / out / rate estimate)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.fbf.schemas.project_skill_schemas import ProjectSkillOut


class ProjectCreate(BaseModel):
    """Eingabe-Schema fuer das manuelle/agentische Anlegen eines Projects.

    Attributes:
        url: Vollstaendige Projekt-URL – globaler Dedup-Key (Pflicht).
        title: Projekttitel (Pflicht).
        description: Projektbeschreibung als Markdown.
        city: Standort-Stadt.
        country: Standort-Land.
        remote_percent: Remote-Anteil in Prozent (0–100).
        contract_type: Vertragstyp (z. B. "contracting").
        duration: Projektdauer als Text (z. B. "6 Monate").
        start_date: Startdatum als Text (z. B. "5/2026").
        posted_at: Einstelldatum auf dem Portal (UTC).
        industry: Branche.
        company_name: Firmenname (direkt am Projekt, CRM-Ergaenzung).
        contact_name: Kontaktname (direkt am Projekt, CRM-Ergaenzung).
        endcustomer: Direktvergabe vom Endkunden (True) oder Vermittler (False).
            None = keine Angabe.
    """

    url: str
    title: str
    description: str | None = None
    city: str | None = None
    country: str | None = None
    remote_percent: int | None = None
    contract_type: str | None = None
    duration: str | None = None
    start_date: str | None = None
    posted_at: datetime | None = None
    industry: str | None = None
    company_name: str | None = None
    contact_name: str | None = None
    endcustomer: bool | None = None


class ProjectOut(BaseModel):
    """Ausgabe-Schema fuer ein normalisiertes Project.

    Attributes:
        id: Primaerschluessel.
        url: Vollstaendige Projekt-URL.
        title: Projekttitel (Scraped-Rohwert).
        title_normalized: Kuratierter, bereinigter Projekttitel – Rollen-Quelle
            fuer Betreff + Anschreiben der Bewerbungs-Mail (None = Fallback
            ``normalize_title(title)``).
        description: Projektbeschreibung als Markdown.
        merged_description_de: LLM-konsolidierte deutsche Beschreibung (nur Master).
        merged_at: Zeitpunkt der letzten Zusammenfassung (None = nie gemergt).
        city: Standort-Stadt.
        country: Standort-Land.
        remote_percent: Remote-Anteil in Prozent (0–100).
        contract_type: Vertragstyp.
        duration: Projektdauer als Text.
        start_date: Startdatum als Text.
        posted_at: Einstelldatum auf dem Portal.
        scraped_at: Zeitpunkt des Scraping-Laufs.
        canonical_id: Self-FK – ID des kanonischen Master-Projekts (None = selbst Master).
        similarity_score: Aehnlichkeitsscore zum kanonischen Projekt (0.0–1.0).
        match_score: Gewichteter Deckungsgrad (0–100) gegen den eigenen
            Wissensstand (None = nicht berechenbar / keine bewerteten Skills).
            Schliesst blacklisted Skills aus.
        confirmed_score: Wie match_score, aber nur mit ``status='confirmed'``
            Skills berechnet (None = keine confirmed Skills mit Level).
        public_score: Wie confirmed_score (nur ``status='active'`` Skills), aber
            mit dem oeffentlichen ``level_public`` statt dem internen ``level``
            berechnet (0–100; None = nicht berechenbar). Nur im Detail-Output
            befuellt – abgeleitet, nicht persistiert.
        company_name: Firmenname (direkt am Projekt, CRM-Ergaenzung).
        contact_name: Kontaktname (direkt am Projekt, CRM-Ergaenzung).
        hourly_rate: Geschaetzter Angebots-Stundensatz (EUR/h, Obergrenze der
            Schaetzung; None = nicht geschaetzt).
        my_hourly_rate: Eigener (manuell gepflegter) Stundensatz in EUR/h
            (None = kein eigener Satz gesetzt).
        my_start_date: Manueller Start-Override (None = kein Override).
        endcustomer: Direktvergabe vom Endkunden (True) oder Vermittler (False).
            None = keine Angabe.
        notes: Freitext-Bemerkungen zum Projekt (Markdown-Rohquelle; None = keine Bemerkungen).
        slave_count: Anzahl Slave-Projekte (canonical_id verweist auf dieses Projekt).
        search_term: Name des Scraper-Suchbegriffs (Provenienz, 1:1 single value).
        freelancermap_id: Primaerschluessel des zugehoerigen Roh-Datensatzes in
            ``project_freelancer_map`` (per url aufgeloest; None = kein Roh-Datensatz,
            z.B. manuell angelegte Endkunden-Master). Ziel des "Rohdaten"-Links.
        job_role_name: Klassifizierter JobRole-Name (None wenn nicht gesetzt).
        contacts: Verknuepfte Kontakte (company, company_type, contact_name).
        skills: Verknuepfte Skills (name, importance, level),
            nach ``importance`` DESC – nur im Detail-Output befuellt.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    title: str
    title_normalized: str | None = None
    description: str | None
    merged_description_de: str | None = None
    merged_at: datetime | None = None
    last_merge_call_log_id: int | None = None
    endcustomer_researched_at: datetime | None = None
    city: str | None
    country: str | None
    remote_percent: int | None
    contract_type: str | None
    duration: str | None
    start_date: str | None
    posted_at: datetime | None
    scraped_at: datetime | None
    canonical_id: int | None = None
    similarity_score: float | None = None
    match_score: float | None = None
    confirmed_score: float | None = None
    public_score: float | None = None
    company_name: str | None = None
    contact_name: str | None = None
    industry: str | None = None
    notes: str | None = None
    hourly_rate: int | None = None
    my_hourly_rate: int | None = None
    my_start_date: str | None = None
    endcustomer: bool | None = None
    slave_count: int = 0
    search_term: str | None = None
    freelancermap_id: int | None = None
    job_role_name: str | None = None
    skills: list[ProjectSkillOut] = []
    status: str | None = None
    status_color_token: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _inject_job_role_name(cls, data: object) -> object:
        """Inject ``job_role_name`` from the ``job_role`` relationship.

        When ``from_attributes=True``, Pydantic looks for ``job_role_name`` on the
        ORM object, but the attribute is called ``job_role``. This pre-validator
        extracts the name and injects it so the regular field validation can pick it up.
        """
        if isinstance(data, dict):
            return data
        # ORM object: extract job_role.name into the data dict
        job_role = getattr(data, "job_role", None)
        name: str | None = getattr(job_role, "name", None) if job_role is not None else None
        # Build a dict from model fields that exist on the ORM object
        result: dict[str, object] = {}
        for field_name in cls.model_fields:
            try:
                result[field_name] = getattr(data, field_name)
            except AttributeError:
                continue
        # Inject computed fields
        result["job_role_name"] = name
        return result

    @field_validator("search_term", mode="before")
    @classmethod
    def _extract_search_term_name(cls, value: object) -> str | None:
        """Extrahiert den SearchTerm-Namen aus dem ORM-Objekt oder gibt den String zurueck.

        Args:
            value: SearchTerm-ORM-Objekt, String oder None.

        Returns:
            SearchTerm-Name als String oder None.
        """
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return getattr(value, "name", None)


class RateFactorOut(BaseModel):
    """A single factor applied to the base rate (Schicht 2)."""

    label: str = Field(description="Faktor-Name (z. B. 'Länderfaktor').")
    factor: float = Field(description="Multiplikator auf die Basisrate.")
    evidence: str | None = Field(
        default=None,
        description="Der Projekt-Wert, der den Faktor belegt (kein Faktor ohne Beleg).",
    )


class ProjectRateEstimateOut(BaseModel):
    """Result of the deterministic two-layer hourly-rate estimate."""

    base_rate: int = Field(description="Schicht 1 – persönliche Basisrate (EUR/h, Profil).")
    hourly_rate: int = Field(description="Persistierter Projekt-Deckel (EUR/h).")
    target_rate: int = Field(
        description="Zielrate = max(Basisrate, Deckel) – nur Output, nie persistiert.",
    )
    factors: list[RateFactorOut] = Field(description="Angewandte Faktoren (Basis → Deckel).")
    uncertainties: list[str] = Field(
        default_factory=list,
        description="Nicht bewertete Faktoren (mangels Beleg Faktor 1,00).",
    )

"""SQLAlchemy-Modell fuer Project (AIScope-Domain, normalisierte Tabelle)."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import ARRAY, DECIMAL, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.fbf.models.job_role import JobRole
from app.shared.db_access.base import Base


class Project(Base):
    """Normalisierte Projekttabelle – portalunabhaengig.

    Dedup/Master-Slave lebt via Self-Referenz ``canonical_id``.
    Ein Projekt ist global ueber ``url`` eindeutig.

    Der Triage-/Pipeline-Status wird nicht mehr als Spalte am Modell
    gefuehrt, sondern via ``core_statusable`` (polymorphe Junction-Table)
    abgebildet.

    Attributes:
        id: Primaerschluessel.
        url: Vollstaendige Projekt-URL – globaler Dedup-Key.
        title: Projekttitel (Scraped-Rohwert, Provenance).
        title_normalized: Kuratierter, bereinigter Projekttitel – Rollen-Quelle
            fuer Betreff + Anschreiben der Bewerbungs-Mail (NULL = Fallback
            ``normalize_title(title)``).
        description: Projektbeschreibung als Markdown.
        city: Standort-Stadt.
        country: Standort-Land.
        remote_percent: Remote-Anteil in Prozent (0–100).
        contract_type: Vertragstyp (z. B. "contracting").
        duration: Projektdauer als Text (z. B. "6 Monate").
        start_date: Startdatum als Text (z. B. "5/2026").
        posted_at: Einstelldatum auf dem Portal (UTC).
        scraped_at: Zeitpunkt des Scraping-Laufs (UTC).
        canonical_id: Self-FK – NULL = Master; gesetzt = Slave dieses Projekts.
        similarity_score: Aehnlichkeitsscore zum kanonischen Projekt (0.0–1.0).
        match_score: Gewichteter Deckungsgrad (0.00–5.00) gegen den eigenen
            Wissensstand – NULL solange keine Skills mit ``level`` verknuepft sind.
            Schliesst blacklisted Skills aus.
        confirmed_score: Wie ``match_score``, aber nur mit ``status='confirmed'``
            Skills berechnet – NULL wenn keine confirmed Skills mit ``level`` existieren.
        job_role_id: FK zur analytischen JobRole (``fbf_job_role``), gesetzt via
            Klassifikation. Werte NULL bis die LLM-Klassifikation (12-3c) sie fuellt.
        company_name: Firmenname (direkt am Projekt, CRM-Ergaenzung).
        contact_name: Kontaktname (direkt am Projekt, CRM-Ergaenzung).
        hourly_rate: Geschaetzter Angebots-Stundensatz in EUR/h. Persistiert wird
            die **Obergrenze** der Skill-Schaetzung; die Untergrenze liegt 20 €/h
            darunter. ``NULL`` = nicht geschaetzt. Bezug (Endkunde vs. Vermittler)
            ueber ``endcustomer``.
        my_hourly_rate: Eigener (manuell gepflegter) Stundensatz in EUR/h – was
            tatsaechlich verlangt wird. ``NULL`` = kein eigener Satz gesetzt.
        my_start_date: Manuell gepflegter Start (ueberschreibt Ausschreibungstext
            und ``start_date``). Format ``MM/YYYY`` oder ``DD.MM.YYYY``;
            Sofort-Marker (``asap``/``sofort``/``kurzfristig``/``nächstmöglich``/
            ``schnellstmöglich``) markieren einen bewusst sofortigen Start, die
            Ignore-Tokens ``-``/``nein``/``ignore``/``n/a`` einen bewusst
            ignorierten Start. ``NULL`` = kein Override.
        endcustomer: Direktvergabe vom Endkunden (True) oder Vermittler (False).
            None = keine Angabe. Stammt aus dem Freelancermap-JSON-Feld ``project.endcustomer``.
        notes: Freitext-Bemerkungen zum Projekt (Markdown-Quelle). Roh gespeichert und
            roh ausgeliefert – die MD-Darstellung erfolgt ausschliesslich im Frontend.
            ``NULL`` = keine Bemerkungen.
        vector: Embedding-Vektor (1536-dim) fuer Postgres-Embeddings (Dedup).
        job_role: Relationship zur analytischen ``JobRole``.
    """

    __tablename__ = "fbf_project"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    title_normalized: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    remote_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contract_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scraped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    canonical_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fbf_project.id"), nullable=True, index=True)
    similarity_score: Mapped[float | None] = mapped_column(DECIMAL(5, 4), nullable=True)
    match_score: Mapped[Decimal | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    confirmed_score: Mapped[Decimal | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    job_role_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fbf_job_role.id"), nullable=True, index=True)
    merged_description_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    merged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    endcustomer_researched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_merge_call_log_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    hourly_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    my_hourly_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    my_start_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    endcustomer: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    vector: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)

    job_role: Mapped[JobRole | None] = relationship("JobRole", lazy="selectin")

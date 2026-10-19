"""Pydantic-Schemas fuer die Skill-Analyse-Chart-Endpunkte (AIScope-Domain)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RadarPointOut(BaseModel):
    """Ein Radar-Datenpunkt: Soll (``importance``) vs. Ist (``level``) je Skill.

    Attributes:
        skill_id: Primaerschluessel des kanonischen Skills (Trend-Verknuepfung).
        skill_name: Kanonischer Skill-Name (Achsen-Label).
        importance: Kuratierte Wichtigkeit (0–100) – Soll-Wert.
        level: Interner Wissensstand (0–100) – Ist-Wert. None = unbekannt.
    """

    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    skill_name: str
    importance: int | None
    level: int | None


class BarPointOut(BaseModel):
    """Ein Bar-Datenpunkt: Skill nach ``importance`` (Top-N Marktbedarf).

    Attributes:
        skill_id: Primaerschluessel des kanonischen Skills (Trend-Verknuepfung).
        skill_name: Kanonischer Skill-Name.
        importance: Kuratierte Wichtigkeit (0–100).
    """

    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    skill_name: str
    importance: int | None


class TrendPointOut(BaseModel):
    """Ein Trend-Datenpunkt: relative Skill-Haeufigkeit je Zeitfenster.

    Attributes:
        window_start: Beginn des Zeitfensters (``date_trunc``-Wert).
        skill_name: Kanonischer Skill-Name.
        relative_frequency: Anteil der Master mit diesem Skill an allen Mastern
            des Fensters (0.0–1.0).
    """

    model_config = ConfigDict(from_attributes=True)

    window_start: datetime
    skill_name: str
    relative_frequency: float


class ImpactPointOut(BaseModel):
    """Impact-Ranking: Lern-Empfehlung je Skill.

    Attributes:
        skill_id: Primaerschluessel des kanonischen Skills.
        skill_name: Kanonischer Skill-Name.
        project_count: Anzahl Master-Projekte mit diesem Skill.
        avg_importance: Durchschnittliche Project-Importance (LLM, 0–5 Float).
        curated_importance: Kuratierte Importance (Greg, 2/3/5).
        blended_importance: 50 % curated + 50 % avg (via
            :func:`effective_importance` mit ``project_importance=None``).
        level: Gregs aktueller Wissensstand (0–5, None = 0).
        impact: ``blended_importance × project_count × max(5 − level, 1)``.
        current_match: Projekte mit >=75 % Match-Score (aktuell).
        simulated_match: Projekte mit >=75 % nach Level-4-Simulation.
        match_delta: simulated_match − current_match.
    """

    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    skill_name: str
    project_count: int
    avg_importance: float | None
    curated_importance: int | None
    blended_importance: float
    level: int | None
    impact: float
    current_match: int = 0
    simulated_match: int = 0
    match_delta: int = 0


class SwingPointOut(BaseModel):
    """Swing-Analyse: wie viele Projekte ueber die Match-Schwelle springen.

    Simuliert fuer einen Skill, was passiert wenn Gregs Level auf
    ``target_level`` gesetzt wird.

    Attributes:
        skill_id: Primaerschluessel des Skills.
        skill_name: Skill-Name.
        current_level: Gregs aktueller Wissensstand.
        current_avg_score: Durchschnittlicher confirmed_score aller Projekte
            mit diesem Skill (vor Simulation).
        total_projects: Anzahl Projekte mit diesem Skill im Zeitfenster.
        swing_count: Anzahl Projekte, die von < threshold auf >= threshold springen.
    """

    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    skill_name: str
    current_level: int | None
    current_avg_score: float
    total_projects: int
    swing_count: int


class DeltaPointOut(BaseModel):
    """Delta-Analyse: durchschnittlicher Score-Gewinn je Skill.

    Simuliert den ``confirmed_score``, wenn Gregs Level auf ``target_level``
    gesetzt wird, und berechnet das Delta pro Projekt.

    Attributes:
        skill_id: Primaerschluessel des Skills.
        skill_name: Skill-Name.
        current_level: Gregs aktueller Wissensstand.
        project_count: Anzahl Projekte mit diesem Skill im Zeitfenster.
        avg_score_before: Durchschnittlicher confirmed_score vor Simulation.
        avg_score_after: Durchschnittlicher confirmed_score nach Simulation.
        avg_delta: avg_score_after − avg_score_before.
        total_delta: Summer aller Einzel-Deltas ueber alle Projekte.
    """

    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    skill_name: str
    current_level: int | None
    project_count: int
    avg_score_before: float
    avg_score_after: float
    avg_delta: float
    total_delta: float

"""Pydantic schemas for project-linked skills (AIScope domain)."""

from pydantic import BaseModel, ConfigDict


class ProjectSkillOut(BaseModel):
    """Ausgabe-Schema fuer einen mit einem Projekt verknuepften Skill.

    ``effective_importance`` ist der von ``skill_service.effective_importance()``
    vorberechnete aggregierte Wert aus drei Quellen (projektspezifisch,
    Markt-Durchschnitt, kuratiert) – 0–5. Er ersetzt die bisherigen Einzelfelder
    ``importance``, ``project_importance`` und ``avg_project_importance``.

    Attributes:
        id: Primaerschluessel des Skills.
        name: Skill-Name (Anzeige-Label).
        effective_importance: Aggregierte Importance (0–5) – vorberechnet.
        level: Interner Wissensstand (0–5) – Match-Signal. None = unbekannt.
        level_public: Nach aussen gezeigter Wissensstand (0–5). None = unbekannt.
        status: Kuratierungsstatus (confirmed / pending / archived).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    effective_importance: float | None = None
    level: int | None
    level_public: int | None = None
    status: str | None = None


class ProjectSkillPublicOut(BaseModel):
    """Public-Skill-Daten für die Proof-Match-Sektion.

    Nur Skill-Felder – keine Projekt-Metadaten (kein Titel, keine Agentur, kein Score).
    Must-Have-Klassifizierung erfolgt per Threshold im FE (importance > 4).

    Attributes:
        name: Skill-Name.
        importance: Geblendete Importance (0–5) via ``effective_importance``
            (Projekt-LLM-Importance / globaler Durchschnitt / kuratierte
            Importance) – identisch zum Admin/AIScope-Pfad. None = keine Daten.
        level_public: Öffentlicher Wissensstand (0–5).
    """

    model_config = ConfigDict(from_attributes=True)

    name: str
    importance: float | None = None
    level_public: int | None = None

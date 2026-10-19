"""Structured-output contract of the LLM skill-extraction task.

Pure Pydantic DTOs returned by the ``skill-extraction`` task (``task_key``) and
consumed by ``SkillExtractionService``. They are the domain contract of the
task: the service validates and persists against them, and the tag vocabulary
they refer to lives in :mod:`app.fbf.constants`. No I/O, no collaborators.
"""

from __future__ import annotations

from pydantic import AliasChoices, BaseModel, Field

_MIN_IMPORTANCE = 0
_MAX_IMPORTANCE = 5


class ExtractedSkill(BaseModel):
    """Ein vom LLM aus einer Projektbeschreibung extrahierter Skill.

    Attributes:
        name: Skill-Name. Bevorzugt exakt aus der uebergebenen Katalog-Liste;
            sonst ein neuer Vorschlag in gaengiger Schreibweise.
        importance_guess: Projekt-spezifische LLM-Importance (0–5).
            5 = Must-Have, 4 = Technologien, 3 = Nice-to-Have,
            2 = Aufgaben/Fließtext, 1 = nur erwähnt, 0 = nicht relevant.
        confidence: Optionale Extraktions-Konfidenz (0.0–1.0).
        tags: Kategorie-Tags aus der vorgegebenen Enum-Liste (mindestens einer).
            Nur die 12 vordefinierten Tag-Namen sind gueltig – kein Freitext.
    """

    name: str = Field(min_length=1)
    importance_guess: int = Field(
        ge=_MIN_IMPORTANCE,
        le=_MAX_IMPORTANCE,
        validation_alias=AliasChoices("importance_guess", "importance"),
    )
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class SkillExtractionResult(BaseModel):
    """Structured-Output-Huelle fuer einen Skill-Extraktions-Call.

    ``with_structured_output`` benoetigt ein einzelnes Schema, daher wird die
    Skill-Liste in dieses Wrapper-Modell gebettet.

    Attributes:
        skills: Liste der extrahierten Skills (ohne Duplikate).
        job_role_match: Exakter Name einer bekannten (confirmed) Rolle aus der
            im Prompt uebergebenen Liste – oder ``None``.
        job_role_new: Vorschlag fuer eine neue Rolle, wenn keine bekannte passt –
            oder ``None``. Genau eines von ``job_role_match``/``job_role_new``
            ist gesetzt (oder beide ``None`` bei unklarer Rolle).
    """

    skills: list[ExtractedSkill] = Field(default_factory=list)
    job_role_match: str | None = None
    job_role_new: str | None = None


class FailedProject(BaseModel):
    """Ein im Backfill fehlgeschlagenes Master-Projekt.

    Attributes:
        project_id: ID des betroffenen Master-Projekts.
        error_type: Standardisierter Fehlertyp (``CallErrorType``-Wert).
        message: Menschlich lesbare Fehlermeldung.
    """

    project_id: int
    error_type: str
    message: str

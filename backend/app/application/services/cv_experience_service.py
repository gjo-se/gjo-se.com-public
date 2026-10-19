"""Localized story/experience mapping for the application CV (gjo_se_com).

Maps the profile's ``story`` and the profile's active experiences to the
Jinja-ready blocks of the CV context. Every text block is taken from the German
translation (fallback: first available locale). Pure mapping – no I/O.
"""

from __future__ import annotations

from datetime import date

from app.application.schemas.experience_schemas import ExperienceOut
from app.application.schemas.profile_schemas import ProfileOut

#: Fallback locale for every locale→DTO map rendered in the CV.
FALLBACK_LOCALE = "de"


def _pick_translation_map[LocalizedT](translations: dict[str, LocalizedT]) -> LocalizedT | None:
    """Returns the German entry of a locale→DTO map, falling back to the first."""
    return translations.get(FALLBACK_LOCALE) or next(iter(translations.values()), None)


def _format_period(start_date: date, end_date: date | None) -> str:
    """Formats an experience period as ``MM/YYYY – MM/YYYY`` (``heute`` if open).

    The end date is omitted-safe: an ongoing project (``end_date is None``)
    renders as ``MM/YYYY – heute``.
    """
    start = start_date.strftime("%m/%Y")
    end = end_date.strftime("%m/%Y") if end_date is not None else "heute"
    return f"{start} – {end}"


def build_story(profile: ProfileOut) -> str | None:
    """Returns the localized ``story`` of the profile (de fallback)."""
    translation = _pick_translation_map(profile.translations)
    return translation.story if translation is not None else None


def _build_decisions(experience: ExperienceOut) -> list[dict[str, str | None]]:
    """Builds the localized decision bullets of an experience (``sort`` ASC)."""
    decisions: list[dict[str, str | None]] = []
    for decision in experience.decisions:
        translation = _pick_translation_map(decision.translations)
        if translation is None:
            continue
        decisions.append(
            {
                "title": translation.title,
                "body": translation.body,
                "discarded": translation.discarded,
            }
        )
    return decisions


def _build_proofs(experience: ExperienceOut) -> list[dict[str, str | None]]:
    """Builds the localized proof bullets of an experience (``sort`` ASC)."""
    proofs: list[dict[str, str | None]] = []
    for proof in experience.proofs:
        translation = _pick_translation_map(proof.translations)
        if translation is None:
            continue
        proofs.append({"text": translation.text})
    return proofs


def build_experiences(
    rows: list[tuple[ExperienceOut, str | None, str | None]],
) -> list[dict[str, object]]:
    """Builds the CV ``Experience`` list from the profile's active experiences.

    Every text block is a single, Jinja-ready field taken from the German
    translation (fallback: first available locale, see :func:`_pick_translation_map`).
    ``company`` is internal-only and deliberately not mapped. Decisions and
    proofs keep the repository ``sort`` order.
    """
    experiences: list[dict[str, object]] = []
    for experience, _status_name, _status_color in rows:
        translation = _pick_translation_map(experience.translations)
        experiences.append(
            {
                "position": experience.position,
                "context": translation.context if translation is not None else None,
                "period": _format_period(experience.start_date, experience.end_date),
                "outcome": translation.outcome if translation is not None else None,
                "problem": translation.problem if translation is not None else None,
                "scope": translation.scope if translation is not None else None,
                "solution_what": translation.solution_what if translation is not None else None,
                "tech_stack": translation.tech_stack if translation is not None else None,
                "evidence": translation.evidence if translation is not None else None,
                "decisions": _build_decisions(experience),
                "proofs": _build_proofs(experience),
                "project_url": experience.project_url,
            }
        )
    return experiences

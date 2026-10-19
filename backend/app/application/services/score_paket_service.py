"""Deterministic application-package prompt preparation.

Builds the flattened ``paket`` prompt string (mail envelope + reduced CV context)
that :func:`run_application_score` hands to the ``application-score`` LLM task.
No LLM, no time/random values – the output is a pure function of its inputs.
"""

from __future__ import annotations

import json

from app.application.schemas.submission_schemas import SubmissionDetailOut

#: Render-only CV-context keys that are noise for the scorer (base64 photo, SVG).
_PAKET_EXCLUDED_KEYS = frozenset({"photo_data_uri", "radar_svg", "skills_radar", "skills", "skill_groups"})


def _scoring_context(cv_context: dict[str, object]) -> dict[str, object]:
    """Reduces the CV context to what the scorer needs and merges the skill area.

    Drops render-only noise (``photo_data_uri``, ``radar_svg``, ``skills_radar``)
    and merges the grouped ATS block (``skill_groups``) with the flat list
    (``skills``) into a single ``skills`` area (``groups`` + ``list``).

    Args:
        cv_context: Context dict built by ``build_application_cv_context``.

    Returns:
        The reduced scoring context (no LLM, no time/random values).
    """
    context = {key: value for key, value in cv_context.items() if key not in _PAKET_EXCLUDED_KEYS}
    context["skills"] = {
        "groups": cv_context.get("skill_groups") or [],
        "list": cv_context.get("skills") or [],
    }
    return context


def _flatten_paket(submission: SubmissionDetailOut, cv_context: dict[str, object]) -> str:
    """Flattens mail and CV context into the deterministic package prompt string.

    Args:
        submission: Submission ORM object (mail subject/body/language).
        cv_context: Context dict built by ``build_application_cv_context``.

    Returns:
        The flattened package text (no LLM, no time/random values).
    """
    return "\n".join(
        [
            f"language: {submission.language}",
            f"subject: {submission.subject}",
            "",
            submission.body,
            "",
            "cv_context:",
            json.dumps(_scoring_context(cv_context), ensure_ascii=False, sort_keys=True, default=str),
        ]
    )

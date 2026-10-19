"""Deterministic engagement-type resolution for the application score.

The free-text job posting takes precedence over the structured
``project.contract_type`` field: postings occasionally disagree with the form
field (e.g. field ``contracting`` while the text says "Vertragsart: ANÜ").

Unlike the remote axis, contract text is **negation-heavy** ("Kein ANÜ",
"Freelancer ausgeschlossen", "ausdrücklich nicht freiberuflich"). A naive marker
scan would therefore invert the meaning, so this module only accepts a
non-negated statement and treats unlabeled, contradictory or negated wording as
"no signal" (the structured field then decides). Marker matching uses word
boundaries – ``an[üu]`` must not match "m**anu**eller".
"""

from __future__ import annotations

import re

#: Source tag when the text scan produced the model.
SOURCE_TEXT = "text"
#: Source tag when the structured field produced the model.
SOURCE_FIELD = "project.contract_type"
#: Source tag when neither source yields a model.
SOURCE_NONE = "none"

#: Canonical internal models.
FREELANCE = "freelance"
NON_FREELANCE = "non_freelance"

#: Structured ``contract_type`` values mapped to internal models.
_FIELD_FREELANCE = ("contracting",)
_FIELD_NON_FREELANCE = ("employee_leasing", "permanent_position")

#: Non-freelance markers (ANÜ / temporary employment / permanent).
_NON_FREELANCE_PATTERN = re.compile(
    r"\b(?:an[üu]|arbeitnehmer[üu]berlassung|zeitarbeit|leiharbeit|personalleasing|"
    r"[üu]berlassung|festanstellung|fest\s*angestellt|unbefristet)\b",
    re.IGNORECASE,
)
#: Freelance markers.
_FREELANCE_PATTERN = re.compile(
    r"\b(?:freiberuflich\w*|freelance\w*|contracting|werkvertrag\w*|dienstvertrag\w*)\b",
    re.IGNORECASE,
)
#: Labels that introduce an explicit contract statement in the posting text.
_LABEL_PATTERN = re.compile(
    r"(?:vertragsart|anstellungsart|einsatzmodell|einsatzform|vertragsbasis|contract\s*type)",
    re.IGNORECASE,
)
#: Negation cues directly before a marker ("kein ANÜ", "no freelance").
_NEGATION_BEFORE = re.compile(r"\b(?:kein\w*|nicht|ohne|no|not|without)\b", re.IGNORECASE)
#: Negation cues directly after a marker ("Freelancer sind ausgeschlossen").
_NEGATION_AFTER = re.compile(
    r"^[^\w]{0,6}(?:sind|ist|werden)?[^\w]{0,6}(?:ausgeschlossen|nicht\s+m[öo]glich|undenkbar)\b",
    re.IGNORECASE,
)
#: Character window searched before/after a marker for negation cues.
_NEGATION_WINDOW = 25
#: Character window read after a label for the actual contract statement.
_LABEL_STATEMENT_WINDOW = 60


def _non_negated_hits(pattern: re.Pattern[str], text: str) -> list[re.Match[str]]:
    """Returns marker matches that are not negated in their local context."""
    hits: list[re.Match[str]] = []
    for match in pattern.finditer(text):
        before = text[max(0, match.start() - _NEGATION_WINDOW) : match.start()]
        after = text[match.end() : match.end() + _NEGATION_WINDOW]
        if _NEGATION_BEFORE.search(before) or _NEGATION_AFTER.search(after):
            continue
        hits.append(match)
    return hits


def _classify(segment: str) -> str | None:
    """Classifies a text segment into one model, or ``None`` when ambiguous."""
    freelance = bool(_non_negated_hits(_FREELANCE_PATTERN, segment))
    non_freelance = bool(_non_negated_hits(_NON_FREELANCE_PATTERN, segment))
    if freelance and not non_freelance:
        return FREELANCE
    if non_freelance and not freelance:
        return NON_FREELANCE
    return None


def detect_contract_from_text(
    text: str | None,
    *,
    labeled_only: bool = True,
) -> str | None:
    """Detects the contract model stated in the posting text.

    Explicitly labeled statements ("Vertragsart: ANÜ", "Anstellungsart: …")
    take precedence. Unlabeled whole-text scanning only runs when
    ``labeled_only`` is ``False`` (i.e. the structured field is unknown) –
    postings mention "freelance"/"contracting" in passing (benefits, negations),
    so a blanket scan would misfire. Ambiguous/negated wording yields ``None``.
    """
    if not text:
        return None
    for label in _LABEL_PATTERN.finditer(text):
        statement = text[label.end() : label.end() + _LABEL_STATEMENT_WINDOW]
        model = _classify(statement)
        if model is not None:
            return model
    if labeled_only:
        return None
    return _classify(text)


def _field_model(field: str | None) -> str | None:
    """Maps the structured ``contract_type`` value to an internal model."""
    if field in _FIELD_FREELANCE:
        return FREELANCE
    if field in _FIELD_NON_FREELANCE:
        return NON_FREELANCE
    return None


def resolve_required_contract(
    *,
    text: str | None,
    field: str | None,
) -> tuple[str | None, str]:
    """Resolves the contract model with text precedence over the field.

    Returns:
        Tuple of ``(model, source)`` where ``source`` is one of
        :data:`SOURCE_TEXT`, :data:`SOURCE_FIELD` or :data:`SOURCE_NONE`.
    """
    field_model = _field_model(field)
    text_model = detect_contract_from_text(text, labeled_only=field_model is not None)
    if text_model is not None:
        return text_model, SOURCE_TEXT
    if field_model is not None:
        return field_model, SOURCE_FIELD
    return None, SOURCE_NONE

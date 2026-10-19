"""CV skill selection: group and sort (gjo_se_com).

Pure data preparation for the application CV – turns the raw project↔skill links
(original name + resolved master group) into an ATS-friendly, grouped skill
list. No DB access, no LLM, fully reproducible.

Within a rendered **group** all variants are emitted, except **fragments**: a
name that is a partial name of another name in the same group (e.g.
``CI`` / ``CI/CD`` / ``Pipelines`` next to ``CI/CD-Pipelines``) is dropped.
Independent concepts (``Prompt Engineering`` vs ``Structured Outputs``) are
never collapsed. No rename, no per-master single representative, no
acronym/long-form substitution.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.shared.ports.skill import CvSkillLink


def _normalize(name: str) -> str:
    """Normalize a name for fragment comparison.

    Case-insensitive; ``-``/``_``/space are treated alike so that ``CI/CD`` is
    recognised as a fragment of ``CI/CD-Pipelines`` and ``Software-Engineering``
    equals ``Software Engineering``.
    """
    normalized = name.replace("-", " ").replace("_", " ").casefold()
    return " ".join(normalized.split())


def _without_fragments(names: list[str]) -> list[str]:
    """Drop fragments and duplicate spellings from one group's name set.

    Two steps:
    1. One form per normalized concept (the casefold-smallest spelling wins) –
       removes pure spelling duplicates (``Software-Engineering`` vs
       ``Software Engineering``).
    2. Drop every name whose normalized form is a proper substring of another
       kept name's normalized form – removes fragments (``CI``, ``CI/CD``,
       ``Pipelines`` for ``CI/CD-Pipelines``; ``Function Calling`` /
       ``Tool Calling`` for ``Function Calling / Tool Calling``).

    Independent concepts (``Prompt Engineering`` vs ``Structured Outputs``) are
    neither equal nor substrings of each other and therefore all survive.
    """
    best: dict[str, str] = {}
    for name in names:
        key = _normalize(name)
        current = best.get(key)
        if current is None or name.casefold() < current.casefold():
            best[key] = name
    kept = list(best.values())
    normalized = {name: _normalize(name) for name in kept}
    return [
        name
        for name in kept
        if not any(
            other != name and normalized[name] != normalized[other] and normalized[name] in normalized[other]
            for other in kept
        )
    ]


def build_cv_skill_groups(rows: list[CvSkillLink]) -> list[dict[str, object]]:
    """Builds the grouped CV skill list from raw project-skill links.

    Rows are grouped by curated ``group_id``. Per group **all** linked variants
    are emitted, except fragments and pure spelling duplicates within the group
    (see :func:`_without_fragments`). ``importance`` neither gates nor orders the
    output; the list is **not** capped.

    Names are sorted A–Z within a group; groups are ordered by ``group_sort ASC``
    (label breaks ties for a stable order).

    Args:
        rows: Auto rows from ``get_cv_skill_rows`` (original name, group meta).

    Returns:
        ``[{"label": <group label>, "skills": [<name>, …]}, …]`` in group order;
        empty when there are no rows.
    """
    if not rows:
        return []

    group_meta: dict[int, tuple[int, str]] = {}
    group_order: list[int] = []
    group_names: dict[int, list[str]] = {}
    for row in rows:
        group_id = row.group_id or 0
        if group_id not in group_meta:
            # ``(group_sort, label)`` – label breaks ties for a stable order.
            group_meta[group_id] = (row.group_sort or 0, row.group_label or "")
            group_order.append(group_id)
        names = group_names.setdefault(group_id, [])
        if row.original_name not in names:
            names.append(row.original_name)

    group_order.sort(key=lambda group_id: group_meta[group_id])
    return [
        {
            "label": group_meta[group_id][1],
            "skills": sorted(_without_fragments(group_names.get(group_id, [])), key=str.casefold),
        }
        for group_id in group_order
    ]

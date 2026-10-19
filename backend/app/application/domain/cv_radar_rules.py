"""Inline-SVG project radar for the application CV (gjo_se_com).

WeasyPrint does not execute JavaScript, so the ECharts radar of the public
``/skills/<projectId>`` page cannot be reused. This module rebuilds the same
"Soll (``importance``) vs. Ist (``level_public``)" radar server-side as a single
inline SVG string – the light/print variant, without the dark-only glow.

CI-Kanon – final aus dem Light-CI-Kanon (INC 11, Dummy ``bewerbung-cv.html``):
the colour constants below are the approved light/print values of the "Ivory &
Ink" theme (Soll = Salbei ``#4C8B63``, Ist = Gold ``#C9A227``) and are
intentionally duplicated here as a snapshot of the design tokens.
"""

from __future__ import annotations

import math
from typing import Any
from xml.sax.saxutils import escape

# ── CI-Kanon (final, Light „Ivory & Ink" – Dummy bewerbung-cv.html) ──────────
RADAR_COLOR_IMPORTANCE = "#4C8B63"  # Salbei (success) – Soll/Importance
RADAR_COLOR_LEVEL = "#C9A227"  # Gold (primary) – Ist/Level
RADAR_COLOR_GRID = "#E8E3D9"  # --color-border-light / chart-grid
RADAR_COLOR_AXIS_LABEL = "#5A5A62"  # --color-on-surface-muted
RADAR_COLOR_SURFACE = "#FFFFFF"  # weißes Papier (CV-Seitenhintergrund)

MAX_VALUE = 5
RING_COUNT = 5
MAX_AXES = 7
MIN_AXES = 3

_VIEWBOX_W = 460
_VIEWBOX_H = 300
_CENTER_X = _VIEWBOX_W / 2.0
_CENTER_Y = _VIEWBOX_H / 2.0
_RADIUS = 100.0
_LABEL_GAP = 16.0
_LABEL_ANCHOR_COS_THRESHOLD = 0.35
_MONO_FONT = "'Geist Mono', ui-monospace, Menlo, Consolas, monospace"


def _axis_xy(index: int, total: int, ratio: float) -> tuple[float, float]:
    """Returns the point on axis ``index`` at ``ratio`` (0..1) of the radius.

    The angle starts at -90° (12 o'clock) and advances clockwise, so axis 2
    sits at 1 o'clock – matching the FE ``clockwise: true`` configuration.
    """
    angle = math.radians(-90.0 + index * 360.0 / total)
    dist = _RADIUS * max(0.0, min(ratio, 1.0))
    return (_CENTER_X + dist * math.cos(angle), _CENTER_Y + dist * math.sin(angle))


def _ring_points(total: int, ratio: float) -> str:
    """SVG ``points`` string of a concentric grid ring at ``ratio`` (0..1)."""
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in (_axis_xy(i, total, ratio) for i in range(total)))


def _polygon_points(values: list[float], total: int) -> str:
    """SVG ``points`` string for a data polygon (values on the 0..MAX_VALUE scale)."""
    return " ".join(
        f"{x:.2f},{y:.2f}" for x, y in (_axis_xy(i, total, value / MAX_VALUE) for i, value in enumerate(values))
    )


def _label_xy(index: int, total: int) -> tuple[float, float]:
    """Returns the anchor point of an axis label, ``_LABEL_GAP`` beyond the ring.

    Uses the raw distance instead of :func:`_axis_xy`, whose ratio is clamped to
    ``1.0`` for data values (labels lie outside the outer ring and would be
    clamped onto it).
    """
    angle = math.radians(-90.0 + index * 360.0 / total)
    dist = _RADIUS + _LABEL_GAP
    return (_CENTER_X + dist * math.cos(angle), _CENTER_Y + dist * math.sin(angle))


def _label_anchor(index: int, total: int) -> str:
    """Horizontal text anchor for an axis label (left/right/centred)."""
    cos_angle = math.cos(math.radians(-90.0 + index * 360.0 / total))
    if cos_angle > _LABEL_ANCHOR_COS_THRESHOLD:
        return "start"
    if cos_angle < -_LABEL_ANCHOR_COS_THRESHOLD:
        return "end"
    return "middle"


def _value(skill: dict[str, Any], key: str) -> float:
    """Reads a numeric field from a skill dict, clamped to ``0..MAX_VALUE``."""
    raw = skill.get(key)
    if raw is None:
        return 0.0
    try:
        return max(0.0, min(float(raw), float(MAX_VALUE)))
    except (TypeError, ValueError):
        return 0.0


def build_radar_svg(skills: list[dict[str, Any]]) -> str:
    """Builds the inline-SVG project radar (Soll vs. Ist).

    Args:
        skills: Already top-``MAX_AXES`` skills sorted by ``importance`` DESC,
            each ``{"name": str, "importance": float | None, "level_public": int | None}``.

    Returns:
        A self-contained ``<svg>…</svg>`` string without external resources, or
        ``""`` when fewer than ``MIN_AXES`` skills are supplied (no polygon).
    """
    axes = skills[:MAX_AXES]
    count = len(axes)
    if count < MIN_AXES:
        return ""

    importance_values = [_value(skill, "importance") for skill in axes]
    level_values = [_value(skill, "level_public") for skill in axes]

    parts: list[str] = [
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {_VIEWBOX_W:g} {_VIEWBOX_H:g}" '
        f'width="{_VIEWBOX_W:g}" height="{_VIEWBOX_H:g}" role="img" '
        'aria-label="Skill-Profil: Soll vs. Ist">',
        "<defs>",
        (
            f'<radialGradient id="radarLevel" cx="{_CENTER_X:g}" cy="{_CENTER_Y:g}" '
            f'r="{_RADIUS:g}" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{RADAR_COLOR_LEVEL}" stop-opacity="0.08"/>'
            f'<stop offset="1" stop-color="{RADAR_COLOR_LEVEL}" stop-opacity="0.02"/>'
            "</radialGradient>"
        ),
        "</defs>",
    ]

    # ── Spinnennetz: konzentrische Ringe + Speichen ──
    parts.extend(
        f'<polygon points="{_ring_points(count, ring / RING_COUNT)}" fill="none" '
        f'stroke="{RADAR_COLOR_GRID}" stroke-width="1" stroke-opacity="0.6"/>'
        for ring in range(1, RING_COUNT + 1)
    )
    for i in range(count):
        x, y = _axis_xy(i, count, 1.0)
        parts.append(
            f'<line x1="{_CENTER_X:g}" y1="{_CENTER_Y:g}" x2="{x:.2f}" y2="{y:.2f}" '
            f'stroke="{RADAR_COLOR_GRID}" stroke-width="1"/>'
        )

    # ── Soll (importance): ruhige gestrichelte Kontur, keine Fläche/Punkte ──
    parts.append(
        f'<polygon points="{_polygon_points(importance_values, count)}" fill="none" '
        f'stroke="{RADAR_COLOR_IMPORTANCE}" stroke-width="1.5" '
        'stroke-dasharray="4 3" stroke-linejoin="round" stroke-linecap="round"/>'
    )

    # ── Ist (level_public): radialer Flächen-Gradient + Linie + Ring-Punkte, ohne Glow ──
    parts.append(
        f'<polygon points="{_polygon_points(level_values, count)}" '
        f'fill="url(#radarLevel)" stroke="{RADAR_COLOR_LEVEL}" stroke-width="2" '
        'stroke-linejoin="round" stroke-linecap="round"/>'
    )
    for i, value in enumerate(level_values):
        x, y = _axis_xy(i, count, value / MAX_VALUE)
        parts.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="2" fill="{RADAR_COLOR_SURFACE}" '
            f'stroke="{RADAR_COLOR_LEVEL}" stroke-width="2"/>'
        )

    # ── Achsen-Labels in Mono ──
    for i, skill in enumerate(axes):
        x, y = _label_xy(i, count)
        label = escape(str(skill.get("name", "")))
        parts.append(
            f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{_label_anchor(i, count)}" '
            f'dominant-baseline="middle" font-family="{_MONO_FONT}" font-size="9" '
            f'fill="{RADAR_COLOR_AXIS_LABEL}">{label}</text>'
        )

    parts.append("</svg>")
    return "".join(parts)

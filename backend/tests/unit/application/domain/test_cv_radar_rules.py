"""Unit tests for the inline-SVG project radar builder.

Covers ``cv_radar_rules.build_radar_svg``: the minimum-axis guard, the
``MAX_AXES`` cap, value clamping to ``0..MAX_VALUE`` (incl. non-numeric and
out-of-range input) and XML-escaping of axis labels. Pure string building for
the print CV – no JS, no DB.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.application.domain import cv_radar_rules as radar

pytestmark = pytest.mark.unit


def _skill(name: str, importance: Any = 3, level_public: Any = 3) -> dict[str, Any]:
    """Build a radar skill dict with the given values."""
    return {"name": name, "importance": importance, "level_public": level_public}


@pytest.mark.parametrize("count", [0, 1, 2])
def test_build_radar_svg_returns_empty_below_min_axes(count: int) -> None:
    """Fewer than ``MIN_AXES`` skills produce no polygon and an empty string."""
    skills = [_skill(f"S{i}") for i in range(count)]

    assert radar.build_radar_svg(skills) == ""


def test_build_radar_svg_renders_self_contained_svg_for_three_axes() -> None:
    """Three skills form a self-contained SVG with rings, polygons and labels."""
    result = radar.build_radar_svg([_skill("A"), _skill("B"), _skill("C")])

    assert result.startswith("<svg")
    assert result.endswith("</svg>")
    assert result.count("<polygon ") == radar.RING_COUNT + 2
    assert result.count("<line ") == 3
    assert result.count("<text ") == 3


def test_build_radar_svg_caps_axes_at_max() -> None:
    """More than ``MAX_AXES`` skills are truncated to the radar cap."""
    skills = [_skill(f"S{i}") for i in range(radar.MAX_AXES + 4)]

    result = radar.build_radar_svg(skills)

    assert result.count("<text ") == radar.MAX_AXES


def test_build_radar_svg_escapes_axis_label_markup() -> None:
    """Axis labels are XML-escaped so raw markup cannot break the SVG."""
    result = radar.build_radar_svg([_skill("C<&>Sharp"), _skill("B"), _skill("A")])

    assert "C&lt;&amp;&gt;Sharp" in result
    assert "<&>" not in result


def test_build_radar_svg_clamps_values_above_max() -> None:
    """Values above ``MAX_VALUE`` are clamped to the outer ring."""
    clamped = radar.build_radar_svg([_skill("A", 999, 999), _skill("B", 999, 999), _skill("C", 999, 999)])
    at_max = radar.build_radar_svg(
        [_skill("A", radar.MAX_VALUE, radar.MAX_VALUE), _skill("B", 5, 5), _skill("C", 5, 5)]
    )

    assert clamped == at_max


def test_build_radar_svg_treats_non_numeric_values_as_zero() -> None:
    """A non-numeric importance/level degrades to zero instead of raising."""
    non_numeric = radar.build_radar_svg([_skill("A", "abc", "abc"), _skill("B", None, None), _skill("C", 0, 0)])
    all_zero = radar.build_radar_svg([_skill("A", 0, 0), _skill("B", 0, 0), _skill("C", 0, 0)])

    assert non_numeric == all_zero


def test_build_radar_svg_clamps_negative_values_to_zero() -> None:
    """Negative values are clamped to the centre."""
    negative = radar.build_radar_svg([_skill("A", -4, -4), _skill("B", -4, -4), _skill("C", -4, -4)])
    all_zero = radar.build_radar_svg([_skill("A", 0, 0), _skill("B", 0, 0), _skill("C", 0, 0)])

    assert negative == all_zero


# ── Geometrie (Golden-Werte) ────────────────────────────────────────────────
# Die Koordinaten sind das beobachtbare Interface des Radars. Ohne exakte
# Erwartungswerte überleben Mutationen an der Winkel-/Radius-/Clamp-Mathematik
# (jede Skalierung betrifft Erwartung und Ist gleich → Vergleich bleibt gleich).
# Referenz: count=3, values [5, 3, 0], center (230, 150), radius 100, gap 16.
_REFERENCE_SKILLS = [_skill("A", 5, 5), _skill("B", 3, 3), _skill("C", 0, 0)]


def test_build_radar_svg_pins_level_and_importance_polygon_geometry() -> None:
    """The Soll/Ist polygons use the exact axis coordinates (12 o'clock + clockwise)."""
    result = radar.build_radar_svg(_REFERENCE_SKILLS)

    expected_points = "230.00,50.00 281.96,180.00 230.00,150.00"
    assert f'<polygon points="{expected_points}" fill="url(#radarLevel)"' in result
    assert f'<polygon points="{expected_points}" fill="none" stroke="{radar.RADAR_COLOR_IMPORTANCE}"' in result


def test_build_radar_svg_pins_grid_ring_and_spoke_geometry() -> None:
    """Grid rings (ring/RING_COUNT) and spokes (ratio 1.0) are pinned exactly."""
    result = radar.build_radar_svg(_REFERENCE_SKILLS)

    assert '<polygon points="230.00,130.00 247.32,160.00 212.68,160.00" fill="none"' in result
    assert 'x2="316.60" y2="200.00"' in result
    assert 'x2="143.40" y2="200.00"' in result


def test_build_radar_svg_pins_label_anchor_and_position() -> None:
    """Label anchors (start/middle/end) and gap positions are pinned exactly."""
    result = radar.build_radar_svg(_REFERENCE_SKILLS)

    assert '<text x="230.00" y="34.00" text-anchor="middle"' in result  # 12 o'clock
    assert '<text x="330.46" y="208.00" text-anchor="start"' in result
    assert '<text x="129.54" y="208.00" text-anchor="end"' in result


@pytest.mark.parametrize(
    ("value", "expected_ratio_point"),
    [(5, "230.00,50.00"), (0, "230.00,150.00")],
)
def test_build_radar_svg_scales_value_to_radius(value: Any, expected_ratio_point: str) -> None:
    """A value is placed at ``value / MAX_VALUE`` of the radius on axis 0."""
    result = radar.build_radar_svg([_skill("A", value, value), _skill("B", 0, 0), _skill("C", 0, 0)])

    assert expected_ratio_point in result

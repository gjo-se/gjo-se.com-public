import type { CardKind } from '../../core/cardKindRegistry';
export type { CardKind } from '../../core/cardKindRegistry';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CardBackgroundProps {
  kind: CardKind;
  width: number;
  height: number;
  /** Fill/stroke Tailwind classes (external cards get different styling). */
  external: boolean;
  /** Status border override from `useStatusBorder()` (S1-Statusfarbe). */
  statusBorder?: { strokeWidth: number; stroke: string; background: string };
}

export interface CardShapeRectProps {
  rx: number;
  ry: number;
  strokeDasharray?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const SYSTEM_HEADER_HEIGHT = 7;
export const CYLINDER_ELLIPSE_HEIGHT = 10;

// UML Component Notation — two small rectangles at the left edge
export const UML_COMPONENT_ICON_X = 6;       // Abstand vom linken Rand
export const UML_COMPONENT_ICON_Y = 8;       // Abstand von oben
export const UML_COMPONENT_RECT_W = 10;      // Breite eines kleinen Rechtecks
export const UML_COMPONENT_RECT_H = 5;       // Höhe eines kleinen Rechtecks
export const UML_COMPONENT_RECT_GAP = 3;     // Abstand zwischen den beiden Rechtecken
export const UML_COMPONENT_ICON_TOTAL_W = 16; // Gesamtbreite des Icons (für Layout-Offset)

// ── Shape Map ──────────────────────────────────────────────────────────────────

const SHAPE_MAP: Record<CardKind, CardShapeRectProps> = {
  system:    { rx: 6,  ry: 6 },
  container: { rx: 12, ry: 12 },
  component: { rx: 4,  ry: 4 },
  store:     { rx: 8,  ry: 8 },
  person:    { rx: 6,  ry: 6 },
  // `table` nutzt keine CardBackground/getCardShapeProps (eigenständige DB-Card),
  // Eintrag nur für die Vollständigkeit des Record<Typ>.
  table:     { rx: 4,  ry: 4 },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns `<rect>` props for a given card kind. */
export function getCardShapeProps(kind: CardKind): CardShapeRectProps {
  return SHAPE_MAP[kind] ?? SHAPE_MAP.system;
}

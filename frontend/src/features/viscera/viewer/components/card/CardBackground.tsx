import { getCardShapeProps } from '../../utils/cardShape';

import CardKindShape from './CardKindShape';

import type { CardBackgroundProps } from '../../utils/cardShape';// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Renders the SVG background shape for a card.
 *
 * Supports five card kinds with distinct shapes:
 * - System: header bar (7px) + rounded rect body (rx=6)
 * - Container: softer corners (rx=12)
 * - Component: tight corners (rx=4) + UML component notation icon
 * - Store: cylinder (rect + ellipse caps)
 * - Person: rounded rect + person icon
 *
 * Z-Index-Verdeckung (#2523): Die Karte wird IMMER als deckende Basis
 * (fill-opacity 1) gerendert, sodass darunter laufende Kanten verdeckt werden.
 * Ein optionaler Status-Tint (Statusfarbe, fillOpacity 0.15) wird als SEPARATES
 * Overlay über der deckenden Basis gelegt — er färbt die Karte nur dezent,
 * ohne die Deckkraft der Karte zu reduzieren (die Kante bleibt verdeckt).
 */
export default function CardBackground({ kind, width, height, external, statusBorder }: CardBackgroundProps) {
  const { rx, ry, strokeDasharray } = getCardShapeProps(kind);

  // Opake Basis in der Canvas-Hintergrundfarbe — verdeckt darunter laufende
  // Kanten, verschmilzt aber unsichtbar mit dem Hintergrund (wirkt transparent,
  // kein "gefüllter Block"). Der Status-Tint (transparent) liegt als Layer
  // darüber für die eindeutige Statuszuordnung (#2523).
  const canvasBg = 'var(--xy-background-color, var(--xy-background-color-default, #ffffff))';
  const baseStrokeClass = external
    ? 'stroke-gray-400 dark:stroke-gray-500'
    : 'stroke-gray-200 dark:stroke-gray-700';

  const strokeWidth = statusBorder?.strokeWidth ?? (kind === 'container' ? 1.5 : 2);
  // Status-Stroke (45% α) überschreibt den neutralen Klassen-Stroke auf der Basis.
  const statusStrokeStyle = statusBorder
    ? ({ stroke: statusBorder.stroke, strokeOpacity: 0.45 } as const)
    : undefined;

  const shapeProps = { kind, width, height, rx, ry, strokeDasharray, strokeWidth };

  return (
    <>
      {/* Deckende Basis (Canvas-Hintergrundfarbe) — verdeckt Kanten (#2523). */}
      <CardKindShape
        {...shapeProps}
        fill={canvasBg}
        strokeClass={baseStrokeClass}
        strokeStyle={statusStrokeStyle}
      />

      {/* Status-Tint-Layer — transparente Statusfarbe für die Zuordnung. */}
      {statusBorder && (
        <CardKindShape {...shapeProps} fill={statusBorder.background} fillOpacity={0.15} />
      )}
    </>
  );
}

/**
 * HelperLines – Drag-Hilfslinien-Overlay (#2523).
 *
 * Rendert aktive Alignment-Linien und Maßlinien (Abstand zum Nachbarn) während
 * eines Card-Drags. Die Geometrie liegt im Flow-Koordinatenraum und wird über
 * das Canvas-Viewport in den Screen-Raum transformiert (screen = flow * zoom +
 * viewport), damit sie korrekt mit Zoom/Pan skalieren.
 *
 * Der Linien-Zustand kommt aus dem separaten `helperLinesStore` — dadurch
 * re-rendert ein Hilfslinien-Update NUR dieses Overlay und niemals die
 * Canvas-Hierarchie (Card-Move bleibt unberührt, #2523).
 */

import { cva } from 'class-variance-authority';
import { memo } from 'react';

import { useHelperLinesStore } from '../../store/helperLinesStore';

import MeasureLine from './MeasureLine';

const overlayVariants = cva('pointer-events-none absolute inset-0 z-40');
const verticalLineVariants = cva('absolute bottom-0 top-0 w-px bg-indigo-500/80');
const horizontalLineVariants = cva('absolute left-0 right-0 h-px bg-indigo-500/80');

import type { Viewport } from '@xyflow/react';

interface HelperLinesProps {
  viewport: Viewport;
}

function HelperLines({ viewport }: HelperLinesProps) {
  const lines = useHelperLinesStore((s) => s.lines);
  if (!lines) return null;
  const { x, y, xGap, yGap } = lines;

  return (
    <div className={overlayVariants()}>
      {x !== undefined && (
        <div
          className={verticalLineVariants()}
          style={{ left: x * viewport.zoom + viewport.x }}
        />
      )}
      {y !== undefined && (
        <div
          className={horizontalLineVariants()}
          style={{ top: y * viewport.zoom + viewport.y }}
        />
      )}

      {xGap && <MeasureLine measure={xGap} viewport={viewport} orientation="horizontal" />}
      {yGap && <MeasureLine measure={yGap} viewport={viewport} orientation="vertical" />}
    </div>
  );
}

export default memo(HelperLines);

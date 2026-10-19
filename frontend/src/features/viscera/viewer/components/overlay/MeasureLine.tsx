/**
 * MeasureLine – Maßlinie (Abstand zum Nachbarn) für das Drag-Hilfslinien-Overlay (#2523).
 *
 * Zeichnet den Abstand zwischen zwei Box-Kanten im Flow-Koordinatenraum als
 * Linie mit Ticks und Zahlen-Label. Die Geometrie wird über das Canvas-Viewport
 * in den Screen-Raum transformiert (screen = flow * zoom + viewport).
 */
import { cva } from 'class-variance-authority';

import type { Measure } from '../../utils/helperLines';
import type { Viewport } from '@xyflow/react';

const labelVariants = cva(
  'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-emerald-500/90 px-1 text-2xs font-medium leading-4 text-white',
);
const horizontalWrapperVariants = cva('absolute h-5');
const hLineVariants = cva('absolute top-1/2 right-0 left-0 h-px bg-emerald-500/80');
const hTickVariants = cva('absolute top-0 h-2 w-px bg-emerald-500/80');
const verticalWrapperVariants = cva('absolute w-5');
const vLineVariants = cva('absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500/80');
const vTickTopVariants = cva('absolute left-0 h-px w-2 bg-emerald-500/80');
const vTickBottomVariants = cva('absolute bottom-0 left-0 h-px w-2 bg-emerald-500/80');

/** Props der `MeasureLine`-Komponente. */
interface MeasureLineProps {
  measure: Measure;
  viewport: Viewport;
  orientation: 'horizontal' | 'vertical';
}

/**
 * Zeichnet eine Maßlinie für die angegebene Orientierung.
 *
 * @param props `measure` (Flow-Geometrie), `viewport` (Zoom/Pan) und
 *   `orientation` ('horizontal' | 'vertical').
 */
function MeasureLine({ measure, viewport, orientation }: MeasureLineProps) {
  const value = Math.round(measure.value);
  const label = (
    <div className={labelVariants()}>
      {value}
    </div>
  );

  if (orientation === 'horizontal') {
    const left = measure.from * viewport.zoom + viewport.x;
    const width = (measure.to - measure.from) * viewport.zoom;
    const top = measure.at * viewport.zoom + viewport.y;

    return (
      <div
        className={horizontalWrapperVariants()}
        style={{ left, top, width, transform: 'translateY(-50%)' }}
      >
        <div className={hLineVariants()} />
        <div className={hTickVariants()} style={{ left: 0 }} />
        <div className={hTickVariants()} style={{ right: 0 }} />
        {label}
      </div>
    );
  }

  const top = measure.from * viewport.zoom + viewport.y;
  const height = (measure.to - measure.from) * viewport.zoom;
  const left = measure.at * viewport.zoom + viewport.x;

  return (
    <div
      className={verticalWrapperVariants()}
      style={{ left, top, height, transform: 'translateX(-50%)' }}
    >
      <div className={vLineVariants()} />
      <div className={vTickTopVariants()} style={{ top: 0 }} />
      <div className={vTickBottomVariants()} />
      {label}
    </div>
  );
}

export default MeasureLine;

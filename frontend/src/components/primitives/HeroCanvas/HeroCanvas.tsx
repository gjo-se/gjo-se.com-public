import type { HeroCanvasProps } from './HeroCanvas.interface';

/**
 * HeroCanvas – geteilte Layout-Grundlage für Public-Hero-Flächen (Portfolio & Skills).
 *
 * Kino-Format 21:9 mit einheitlichem Container-Rahmen (rounded, border, muted-BG) und
 * dunkler Lesbarkeits-Basis für Inhalte im Hero. `children` füllt die 21:9-Fläche
 * (z.B. Bild + Overlay oder Radar-Chart), `footer` ist ein optionales Band unter der
 * Fläche (z.B. Impact-/Stat-Summary). Reines Presentational Primitive – Inhalt und
 * Proportion bestimmt der Aufrufer, damit Portfolio- und Skills-Seite identisch wirken.
 */
export default function HeroCanvas({ children, footer, innerRef }: HeroCanvasProps) {
  return (
    <div className="mb-8 overflow-hidden rounded-lg border border-border bg-muted">
      <div
        ref={innerRef}
        className="relative aspect-hero min-h-hero-canvas w-full sm:min-h-hero-canvas-sm"
      >
        {children}
      </div>
      {footer && <div className="border-t border-border p-6 sm:p-8">{footer}</div>}
    </div>
  );
}

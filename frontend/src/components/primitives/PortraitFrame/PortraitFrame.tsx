import type { PortraitFrameProps } from './PortraitFrame.interface';

/**
 * PortraitFrame – Hochformat-Bildrahmen (3:4) mit Surface-Hintergrund, Haarlinie und
 * abgerundeten Ecken. Zentriert das Kind (Bild oder Fallback) und richtet sich im Grid
 * ab `md` rechtsbündig aus. Reines Presentational-Primitive (closed API, nur `children`).
 */
export default function PortraitFrame({ children }: PortraitFrameProps) {
  return (
    <div className="flex aspect-portrait w-full max-w-portrait items-center justify-center overflow-hidden justify-self-center rounded-lg border border-border-light bg-surface-container md:justify-self-end">
      {children}
    </div>
  );
}

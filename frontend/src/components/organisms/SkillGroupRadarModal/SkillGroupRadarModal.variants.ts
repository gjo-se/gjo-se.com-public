import { cva, type VariantProps } from 'class-variance-authority';

/** Lightbox-Overlay (Surface mit Blur). */
export const radarModalOverlayVariants = cva(
  'fixed inset-0 z-modal flex items-center justify-center bg-surface/90 p-6 backdrop-blur-md',
);

/** Lightbox-Panel (Fläche, Rand, Schatten). */
export const radarModalPanelVariants = cva(
  'relative flex max-h-modal w-full max-w-modal flex-col overflow-hidden rounded-2xl border border-border-light bg-surface shadow-2xl',
);

/** Panel-Kopfzeile mit unterer Haarlinie. */
export const radarModalHeaderVariants = cva(
  'flex items-center justify-between gap-6 border-b border-border-light px-6 py-4',
);

/** Panel-Body mit dem Radar. */
export const radarModalBodyVariants = cva(
  'flex min-h-100 flex-1 items-center justify-center px-6 py-6',
);

/** Panel-Fußzeile mit oberer Haarlinie. */
export const radarModalFooterVariants = cva(
  'flex flex-wrap items-center justify-between gap-6 border-t border-border-light px-6 py-4',
);

/** Legenden-Zeile im Fuß. */
export const radarModalLegendVariants = cva(
  'flex flex-wrap items-center gap-6 font-mono text-xs tracking-label text-on-surface-muted',
);

export type SkillGroupRadarModalVariants = VariantProps<typeof radarModalOverlayVariants>;

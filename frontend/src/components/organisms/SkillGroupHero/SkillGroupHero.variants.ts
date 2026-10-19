import { cva, type VariantProps } from 'class-variance-authority';

/** Zwei-Spalten-Grid des Hero (Text | Radar). */
export const heroGridVariants = cva(
  'grid w-full grid-cols-1 items-start gap-hero-gap md:grid-cols-skills-hero',
);

/** USP-Zeile (Abstand, einzeilig). */
export const heroUspVariants = cva('mt-6 whitespace-nowrap');

/** Subline (Abstand, Lesemaß). */
export const heroSublineVariants = cva('mt-6 max-w-hero-subline');

/** Quadratische Radar-Fläche. */
export const heroRadarFrameVariants = cva('relative aspect-square w-full');

/** Klickbare Radar-Overlay-Fläche. */
export const heroRadarButtonVariants = cva('absolute inset-0 cursor-pointer');

/** Zentrierter Fallback bei zu wenigen Skills. */
export const heroRadarFallbackVariants = cva('flex h-full w-full items-center justify-center px-6');

/** Legenden-Zeile unter dem Radar. */
export const heroLegendVariants = cva(
  'mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-xs tracking-label text-on-surface-muted',
);

export type SkillGroupHeroVariants = VariantProps<typeof heroGridVariants>;

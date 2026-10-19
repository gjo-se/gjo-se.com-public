import { cva, type VariantProps } from 'class-variance-authority';

/** Full-Bleed-Band der Kategorien-Navigation (Hintergrund + Haarlinien brechen mit 100vw aus). */
export const skillCategoryNavBandVariants = cva(
  'absolute inset-y-0 -left-bleed -right-bleed border-y border-border-light bg-surface-container',
);

/** Innerer Inhalts-Container im Seitenrhythmus (`relative` hält die Chips über dem Band). */
export const skillCategoryNavInnerVariants = cva('relative mx-auto w-full max-w-6xl px-6');

export type SkillCategoryNavVariants = VariantProps<typeof skillCategoryNavBandVariants>;

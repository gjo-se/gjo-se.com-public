import { cva, type VariantProps } from 'class-variance-authority';

/** Klickbare Radar-Overlay-Fläche der Match-Sektion. */
export const matchRadarButtonVariants = cva('absolute inset-0 cursor-pointer');

/** Zentrierter Fallback bei zu wenigen Skills. */
export const matchRadarFallbackVariants = cva('flex h-full items-center justify-center px-6');

export type SkillMatchSectionVariants = VariantProps<typeof matchRadarButtonVariants>;

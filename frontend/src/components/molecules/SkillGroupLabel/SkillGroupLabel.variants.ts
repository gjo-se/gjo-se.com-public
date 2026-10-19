import { cva, type VariantProps } from 'class-variance-authority';

/** Overlay-Label in der oberen Ecke einer Radar-Fläche (Klicks gehen an das Radar durch). */
export const skillGroupLabelVariants = cva('pointer-events-none absolute top-4 left-4');

export type SkillGroupLabelVariants = VariantProps<typeof skillGroupLabelVariants>;

import { cva, type VariantProps } from 'class-variance-authority';

/** Fallback-Inhalt, wenn zu wenige Skills für ein Radar vorliegen. */
export const skillGroupRadarFallbackVariants = cva('flex h-full items-center justify-center px-6');

export type SkillGroupRadarVariants = VariantProps<typeof skillGroupRadarFallbackVariants>;

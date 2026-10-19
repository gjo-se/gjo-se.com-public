import { cva, type VariantProps } from 'class-variance-authority';

/** Innere Hero-Spalte (volle Breite, linksbündig gestapelt). */
export const heroSectionInnerVariants = cva('relative z-10 flex w-full flex-col items-start');

/** Headline-Maß (mobil volle Breite, Desktop schmale Zeilenbreite). */
export const heroSectionHeadlineVariants = cva('max-w-full lg:max-w-headline');

/** Subline-Maß (Abstand, Lesemaß). */
export const heroSectionSublineVariants = cva('mt-4 max-w-subline');

export type HeroSectionVariants = VariantProps<typeof heroSectionInnerVariants>;

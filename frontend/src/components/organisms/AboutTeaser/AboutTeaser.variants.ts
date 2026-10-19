import { cva, type VariantProps } from 'class-variance-authority';

/** Rundes Avatar-/Porträt-Rahmenfeld des Teasers (festes Maß, Rand, Fläche). */
export const aboutTeaserPortraitVariants = cva(
  'flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-light bg-surface-container',
);

/** Story-Hook-Fließtext – Lesemaß + gedämpfte Farbe (Prose-Baustein darunter). */
export const aboutTeaserHookVariants = cva('mt-4 max-w-story text-on-surface-secondary');

export type AboutTeaserVariants = VariantProps<typeof aboutTeaserPortraitVariants>;

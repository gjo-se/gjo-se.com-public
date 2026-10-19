import { cva, type VariantProps } from 'class-variance-authority';

/** Zentrierter Fehlerzustand über die halbe Viewport-Höhe. */
export const errorStateVariants = cva(
  'flex min-h-half-viewport flex-col items-center justify-center gap-6 text-center',
);

/** Begrenzte Lesebreite der Fehlerbeschreibung. */
export const errorStateDescriptionVariants = cva('max-w-md');

export type ErrorStateVariants = VariantProps<typeof errorStateVariants>;

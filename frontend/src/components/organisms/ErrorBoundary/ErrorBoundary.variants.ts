import { cva, type VariantProps } from 'class-variance-authority';

/** Zentriertes Fehler-Panel (rote Fläche, Rand) des Default-Fallbacks. */
export const errorBoundaryFallbackVariants = cva(
  'flex min-h-half-viewport flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 px-12 pt-16 pb-8 text-center',
);

export type ErrorBoundaryVariants = VariantProps<typeof errorBoundaryFallbackVariants>;

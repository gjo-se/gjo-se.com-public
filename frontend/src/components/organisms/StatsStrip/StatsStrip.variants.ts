import { cva, type VariantProps } from 'class-variance-authority';

/** Randloses Surface-Band mit oberer/unterer Haarlinie (100vw-Breakout). */
export const statsBandVariants = cva(
  'absolute inset-y-0 -left-bleed -right-bleed border-y border-border-light bg-surface-container',
);

export type StatsStripVariants = VariantProps<typeof statsBandVariants>;

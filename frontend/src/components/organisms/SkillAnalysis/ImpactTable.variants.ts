import { cva, type VariantProps } from 'class-variance-authority';

/** Hinweiszeile über dem Impact-Ranking. */
export const impactSummaryVariants = cva('mb-3 text-xs text-muted-foreground');

export type ImpactTableVariants = VariantProps<typeof impactSummaryVariants>;

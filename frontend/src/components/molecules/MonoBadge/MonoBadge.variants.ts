import { cva, type VariantProps } from 'class-variance-authority';

/** Mono-Chip der Public-Code-&-Karriere-Karten. */
export const monoBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-mono text-xs tracking-label text-on-surface-secondary',
);

export type MonoBadgeVariants = VariantProps<typeof monoBadgeVariants>;

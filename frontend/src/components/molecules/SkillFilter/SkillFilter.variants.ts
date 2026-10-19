import { cva, type VariantProps } from 'class-variance-authority';

/** Input-Chrome des Multi-Select (Chips im Eingabefeld). */
export const skillFilterInputVariants = cva(
  'flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
);

/** Ausgewählter Skill als Chip. */
export const skillFilterChipVariants = cva(
  'inline-flex items-center gap-0.5 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-xs',
);

/** Overflow-Chip (`+N`) bei mehr als drei ausgewählten Skills. */
export const skillFilterOverflowVariants = cva('rounded-md bg-muted px-1.5 py-0.5');

export type SkillFilterVariants = VariantProps<typeof skillFilterInputVariants>;

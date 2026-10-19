import { cva, type VariantProps } from 'class-variance-authority';

export const outputVariants = cva('inline-block text-sm', {
  variants: {
    variant: {
      default: 'text-on-surface font-medium',
      muted: 'text-on-surface-subtle',
      success: 'text-success-subtle-text font-semibold',
      error: 'text-destructive font-semibold',
    },
  },
});

export type OutputVariants = VariantProps<typeof outputVariants>;

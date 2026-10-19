import { cva, type VariantProps } from 'class-variance-authority';

export const blockquoteVariants = cva('px-4 py-3 text-sm leading-relaxed', {
  variants: {
    variant: {
      default: 'border-l-4 border-border-heavy text-on-surface-secondary',
      muted: 'border-l-4 border-border text-on-surface-subtle italic',
      accent: 'border-l-4 border-primary bg-primary-subtle-bg text-primary-subtle-text',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type BlockquoteVariants = VariantProps<typeof blockquoteVariants>;

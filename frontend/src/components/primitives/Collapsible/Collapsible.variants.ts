import { cva, type VariantProps } from 'class-variance-authority';

export const collapsibleVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type CollapsibleVariants = VariantProps<typeof collapsibleVariants>;

import { cva, type VariantProps } from 'class-variance-authority';

export const tooltipVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type TooltipVariants = VariantProps<typeof tooltipVariants>;

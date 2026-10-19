import { cva, type VariantProps } from 'class-variance-authority';

export const tooltipProviderVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type TooltipProviderVariants = VariantProps<typeof tooltipProviderVariants>;

import { cva, type VariantProps } from 'class-variance-authority';

export const tooltipTriggerVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type TooltipTriggerVariants = VariantProps<typeof tooltipTriggerVariants>;

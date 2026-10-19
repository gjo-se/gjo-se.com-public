import { cva, type VariantProps } from 'class-variance-authority';

export const collapsibleContentVariants = cva(
  'h-(--collapsible-panel-height) overflow-hidden pt-0 pb-4 data-ending-style:h-0 data-starting-style:h-0',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type CollapsibleContentVariants = VariantProps<typeof collapsibleContentVariants>;

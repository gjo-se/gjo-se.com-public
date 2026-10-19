import { cva, type VariantProps } from 'class-variance-authority';

export const accordionVariants = cva('divide-y', {
  variants: {},
  defaultVariants: {},
});

export type AccordionVariants = VariantProps<typeof accordionVariants>;

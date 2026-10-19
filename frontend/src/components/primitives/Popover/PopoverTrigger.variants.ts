import { cva, type VariantProps } from 'class-variance-authority';

export const popoverTriggerVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type PopoverTriggerVariants = VariantProps<typeof popoverTriggerVariants>;

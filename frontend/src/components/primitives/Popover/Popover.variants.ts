import { cva, type VariantProps } from 'class-variance-authority';

export const popoverVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type PopoverVariants = VariantProps<typeof popoverVariants>;

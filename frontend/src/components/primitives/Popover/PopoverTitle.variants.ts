import { cva, type VariantProps } from 'class-variance-authority';

export const popoverTitleVariants = cva('font-medium', {
  variants: {},
  defaultVariants: {},
});

export type PopoverTitleVariants = VariantProps<typeof popoverTitleVariants>;

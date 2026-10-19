import { cva, type VariantProps } from 'class-variance-authority';

export const dialogVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type DialogVariants = VariantProps<typeof dialogVariants>;

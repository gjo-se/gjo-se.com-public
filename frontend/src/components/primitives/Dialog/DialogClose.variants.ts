import { cva, type VariantProps } from 'class-variance-authority';

export const dialogCloseVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type DialogCloseVariants = VariantProps<typeof dialogCloseVariants>;

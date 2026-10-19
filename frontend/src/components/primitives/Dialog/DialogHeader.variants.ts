import { cva, type VariantProps } from 'class-variance-authority';

export const dialogHeaderVariants = cva('flex flex-col gap-2', {
  variants: {},
  defaultVariants: {},
});

export type DialogHeaderVariants = VariantProps<typeof dialogHeaderVariants>;

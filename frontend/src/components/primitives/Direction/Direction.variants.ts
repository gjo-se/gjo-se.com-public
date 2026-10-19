import { cva, type VariantProps } from 'class-variance-authority';

export const directionVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type DirectionVariants = VariantProps<typeof directionVariants>;

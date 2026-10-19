import { cva, type VariantProps } from 'class-variance-authority';

export const aspectRatioVariants = cva('relative', {
  variants: {},
  defaultVariants: {},
});

export type AspectRatioVariants = VariantProps<typeof aspectRatioVariants>;

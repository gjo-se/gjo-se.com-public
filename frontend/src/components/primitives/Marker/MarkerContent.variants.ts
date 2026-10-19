import { cva, type VariantProps } from 'class-variance-authority';

export const markerContentVariants = cva('min-w-0 wrap-break-word', {
  variants: {},
  defaultVariants: {},
});

export type MarkerContentVariants = VariantProps<typeof markerContentVariants>;

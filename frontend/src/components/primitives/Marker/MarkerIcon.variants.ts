import { cva, type VariantProps } from 'class-variance-authority';

export const markerIconVariants = cva(
  "size-4 shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {},
    defaultVariants: {},
  },
);

export type MarkerIconVariants = VariantProps<typeof markerIconVariants>;

import { cva, type VariantProps } from 'class-variance-authority';

export const dialogPortalVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type DialogPortalVariants = VariantProps<typeof dialogPortalVariants>;

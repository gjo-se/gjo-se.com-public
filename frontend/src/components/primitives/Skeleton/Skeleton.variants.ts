import { cva, type VariantProps } from 'class-variance-authority';

export const skeletonVariants = cva('animate-pulse rounded-md bg-muted', {
  variants: {
    variant: {
      default: '',
      circle: 'rounded-full',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;

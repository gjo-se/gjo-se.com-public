import { cva, type VariantProps } from 'class-variance-authority';

export const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-8',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;

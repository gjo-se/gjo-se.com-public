import { cva, type VariantProps } from 'class-variance-authority';

export const progressVariants = cva('w-full overflow-hidden rounded-full bg-muted', {
  variants: {
    size: {
      default: 'h-1.5',
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export type ProgressVariants = VariantProps<typeof progressVariants>;

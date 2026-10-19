import { cva, type VariantProps } from 'class-variance-authority';

export const chartVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type ChartVariants = VariantProps<typeof chartVariants>;

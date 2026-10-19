import { cva, type VariantProps } from 'class-variance-authority';

export const inputGroupInputVariants = cva(
  'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
  { variants: {}, defaultVariants: {} },
);

export type InputGroupInputVariants = VariantProps<typeof inputGroupInputVariants>;

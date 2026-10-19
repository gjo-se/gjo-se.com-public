import { cva, type VariantProps } from 'class-variance-authority';

export const emptyTitleVariants = cva(
  'font-heading text-lg font-medium tracking-tight',
  { variants: {}, defaultVariants: {} },
);

export type EmptyTitleVariants = VariantProps<typeof emptyTitleVariants>;

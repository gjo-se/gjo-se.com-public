import { cva, type VariantProps } from 'class-variance-authority';

export const dialogDescriptionVariants = cva(
  'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type DialogDescriptionVariants = VariantProps<typeof dialogDescriptionVariants>;

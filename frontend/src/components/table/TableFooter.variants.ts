import { cva, type VariantProps } from 'class-variance-authority';

export const tableFooterVariants = cva(
  'border-t bg-accent/50 font-medium text-accent-foreground [&>tr]:last:border-b-0',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type TableFooterVariants = VariantProps<typeof tableFooterVariants>;

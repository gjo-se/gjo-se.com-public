import { cva, type VariantProps } from 'class-variance-authority';

export const tableHeaderVariants = cva('[&_tr]:border-b bg-gray-50 dark:bg-gray-800', {
  variants: {},
  defaultVariants: {},
});

export type TableHeaderVariants = VariantProps<typeof tableHeaderVariants>;

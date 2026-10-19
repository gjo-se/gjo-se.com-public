import { cva, type VariantProps } from 'class-variance-authority';

export const tableBodyVariants = cva('[&_tr:last-child]:border-0', {
  variants: {},
  defaultVariants: {},
});

export type TableBodyVariants = VariantProps<typeof tableBodyVariants>;

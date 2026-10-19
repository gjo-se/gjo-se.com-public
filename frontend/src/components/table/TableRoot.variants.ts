import { cva, type VariantProps } from 'class-variance-authority';

export const tableRootVariants = cva('w-full caption-bottom text-sm', {
  variants: {},
  defaultVariants: {},
});

export type TableRootVariants = VariantProps<typeof tableRootVariants>;

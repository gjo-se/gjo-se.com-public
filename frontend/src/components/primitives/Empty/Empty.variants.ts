import { cva, type VariantProps } from 'class-variance-authority';

export const emptyVariants = cva(
  'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border-dashed p-12 text-center text-balance',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type EmptyVariants = VariantProps<typeof emptyVariants>;

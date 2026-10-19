import { cva, type VariantProps } from 'class-variance-authority';

export const emptyContentVariants = cva(
  'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
  { variants: {}, defaultVariants: {} },
);

export type EmptyContentVariants = VariantProps<typeof emptyContentVariants>;

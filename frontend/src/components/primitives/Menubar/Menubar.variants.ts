import { cva, type VariantProps } from 'class-variance-authority';

export const menubarVariants = cva(
  'flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type MenubarVariants = VariantProps<typeof menubarVariants>;

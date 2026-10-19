import { cva, type VariantProps } from 'class-variance-authority';

export const messageHeaderVariants = cva(
  'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type MessageHeaderVariants = VariantProps<typeof messageHeaderVariants>;

import { cva, type VariantProps } from 'class-variance-authority';

export const messageContentVariants = cva(
  'flex w-full min-w-0 flex-col gap-2.5 wrap-break-word',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type MessageContentVariants = VariantProps<typeof messageContentVariants>;

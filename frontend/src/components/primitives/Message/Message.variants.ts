import { cva, type VariantProps } from 'class-variance-authority';

export const messageVariants = cva(
  'group/message relative flex w-full min-w-0 gap-2 text-sm',
  {
    variants: {
      align: {
        start: '',
        end: 'flex-row-reverse',
      },
    },
    defaultVariants: {
      align: 'start',
    },
  },
);

export type MessageVariants = VariantProps<typeof messageVariants>;

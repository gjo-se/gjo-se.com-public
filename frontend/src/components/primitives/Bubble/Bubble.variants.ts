import { cva, type VariantProps } from 'class-variance-authority';

export const bubbleVariants = cva(
  'relative flex w-fit max-w-bubble min-w-0 flex-col gap-1',
  {
    variants: {
      variant: {
        default: '',
        secondary: '',
        muted: '',
        ghost: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export const bubbleContentVariants = cva('rounded-xl px-3 py-2 text-sm', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      muted: 'bg-muted text-foreground',
      ghost: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type BubbleVariants = VariantProps<typeof bubbleVariants>;

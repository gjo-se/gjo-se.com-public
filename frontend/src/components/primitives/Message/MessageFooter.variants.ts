import { cva, type VariantProps } from 'class-variance-authority';

export const messageFooterVariants = cva(
  'flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-data-[align=end]/message:justify-end',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type MessageFooterVariants = VariantProps<typeof messageFooterVariants>;

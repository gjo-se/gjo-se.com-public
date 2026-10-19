import { cva, type VariantProps } from 'class-variance-authority';

export const attachmentVariants = cva(
  'relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl border bg-card text-card-foreground transition-colors focus-within:ring-1 focus-within:ring-ring/50',
  {
    variants: {
      size: {
        default: 'gap-2 text-sm px-2.5 py-2',
        sm: 'gap-2.5 text-xs px-2 py-1.5',
        xs: 'gap-1.5 rounded-lg text-xs px-1.5 py-1',
      },
      orientation: {
        horizontal: 'min-w-40 items-center',
        vertical: 'w-24 flex-col',
      },
    },
    defaultVariants: {
      size: 'default',
      orientation: 'horizontal',
    },
  },
);

export type AttachmentVariants = VariantProps<typeof attachmentVariants>;

import { cva, type VariantProps } from 'class-variance-authority';

export const messageAvatarVariants = cva(
  'flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type MessageAvatarVariants = VariantProps<typeof messageAvatarVariants>;

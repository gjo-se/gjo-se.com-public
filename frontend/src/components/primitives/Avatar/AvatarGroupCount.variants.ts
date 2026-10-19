import { cva, type VariantProps } from 'class-variance-authority';

export const avatarGroupCountVariants = cva(
  'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6',
  { variants: {}, defaultVariants: {} },
);

export type AvatarGroupCountVariants = VariantProps<typeof avatarGroupCountVariants>;

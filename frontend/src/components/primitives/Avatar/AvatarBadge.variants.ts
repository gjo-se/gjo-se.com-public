import { cva, type VariantProps } from 'class-variance-authority';
export const avatarBadgeVariants = cva('absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none', { variants: {}, defaultVariants: {} });
export type AvatarBadgeVariants = VariantProps<typeof avatarBadgeVariants>;

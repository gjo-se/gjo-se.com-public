import { cva, type VariantProps } from 'class-variance-authority';
export const avatarImageVariants = cva('aspect-square size-full rounded-full object-cover', { variants: {}, defaultVariants: {} });
export type AvatarImageVariants = VariantProps<typeof avatarImageVariants>;
